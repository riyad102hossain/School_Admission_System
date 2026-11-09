using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics;
using Npgsql;

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
            _ when IsDatabaseBusy(exception) => (StatusCodes.Status503ServiceUnavailable,
                new ErrorResponse(ErrorCodes.ServiceBusy, "The server is busy right now. Please try again in a moment.")),
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

    // Overload or a temporary connection problem: the request itself was fine and can be retried.
    private static bool IsDatabaseBusy(Exception exception)
    {
        for (var e = exception; e is not null; e = e.InnerException)
        {
            if (e is PostgresException { SqlState: var state } && state.StartsWith("53", StringComparison.Ordinal))
            {
                return true; // class 53: insufficient resources, e.g. too many connections
            }
            if (e is NpgsqlException { IsTransient: true } or TimeoutException)
            {
                return true;
            }
        }

        return false;
    }

    private static string DescribeBadRequest(BadHttpRequestException exception) => exception switch
    {
        { StatusCode: StatusCodes.Status415UnsupportedMediaType } => "Request body must be JSON (Content-Type: application/json).",
        { InnerException: JsonException } => "Request body is not valid JSON or a field has the wrong type.",
        _ when exception.Message.Contains("body", StringComparison.OrdinalIgnoreCase) => "Request body is missing or invalid.",
        _ => "The request is invalid."
    };
}
