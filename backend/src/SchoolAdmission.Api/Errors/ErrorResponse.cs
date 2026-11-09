namespace SchoolAdmission.Api.Errors;

/// <summary>Body returned for every non-success response.</summary>
public record ErrorResponse(string Error, string Message);
