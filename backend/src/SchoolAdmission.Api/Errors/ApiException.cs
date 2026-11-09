namespace SchoolAdmission.Api.Errors;

/// <summary>
/// An expected failure that maps to a 4xx response with a machine-readable error code.
/// </summary>
public class ApiException(int statusCode, string errorCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public string ErrorCode { get; } = errorCode;

    public static ApiException Validation(string message) =>
        new(StatusCodes.Status400BadRequest, ErrorCodes.ValidationError, message);

    public static ApiException NotFound(string errorCode, string message) =>
        new(StatusCodes.Status404NotFound, errorCode, message);

    public static ApiException Forbidden(string errorCode, string message) =>
        new(StatusCodes.Status403Forbidden, errorCode, message);

    public static ApiException Conflict(string errorCode, string message) =>
        new(StatusCodes.Status409Conflict, errorCode, message);
}
