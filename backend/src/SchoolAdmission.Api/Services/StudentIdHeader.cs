using SchoolAdmission.Api.Errors;

namespace SchoolAdmission.Api.Services;

public static class StudentIdHeader
{
    public const string Name = "X-Student-Id";
    public const int Length = 17;

    /// <summary>Returns the student ID or throws a 400 if it is missing or not exactly 17 digits.</summary>
    public static string Require(string? value)
    {
        var studentId = value?.Trim();

        if (string.IsNullOrEmpty(studentId))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorCodes.InvalidStudentId,
                $"The {Name} header is required.");
        }

        if (studentId.Length != Length || !studentId.All(char.IsAsciiDigit))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorCodes.InvalidStudentId,
                $"Student ID must be exactly {Length} digits.");
        }

        return studentId;
    }
}
