using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics;

namespace SchoolAdmission.Api.Errors;

/// <summary>
/// Turns exceptions into JSON error responses. Bad input always ends up as a 4xx;
/// only genuinely unexpected failures become a 500.
/// </summary>
public class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        var (statusCode, body) = exception switch
        {
            ApiException e => (e.StatusCode, new ErrorResponse(e.ErrorCode, e.Message)),
            BadHttpRequestException e => (e.StatusCode, new ErrorResponse(ErrorCodes.BadRequest, DescribeBadRequest(e))),
            _ => (StatusCodes.Status500InternalServerError,
                new ErrorResponse(ErrorCodes.InternalError, "Something went wrong on our side. Please try again."))
        };

        if (statusCode >= StatusCodes.Status500InternalServerError)
        {
            logger.LogError(exception, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
        }

        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsJsonAsync(body, cancellationToken);
        return true;
    }

    private static string DescribeBadRequest(BadHttpRequestException exception) => exception switch
    {
        { StatusCode: StatusCodes.Status415UnsupportedMediaType } => "Request body must be JSON (Content-Type: application/json).",
        { InnerException: JsonException } => "Request body is not valid JSON or a field has the wrong type.",
        _ when exception.Message.Contains("body", StringComparison.OrdinalIgnoreCase) => "Request body is missing or invalid.",
        _ => "The request is invalid."
    };
}
