using SchoolAdmission.Api.Domain;

namespace SchoolAdmission.Api.Contracts;

public record CreateHoldResponse(Guid HoldId, Guid ClassId, string StudentId, string Status, DateTimeOffset ExpiresAt)
{
    public static CreateHoldResponse From(Hold h) =>
        new(h.Id, h.ClassId, h.StudentId, h.Status.ToApiValue(), h.ExpiresAt);
}

public record HoldResponse(Guid HoldId, Guid ClassId, string Status, DateTimeOffset ExpiresAt)
{
    public static HoldResponse From(Hold h) =>
        new(h.Id, h.ClassId, h.Status.ToApiValue(), h.ExpiresAt);
}

public record ConfirmHoldResponse(Guid HoldId, string Status)
{
    public static ConfirmHoldResponse From(Hold h) => new(h.Id, h.Status.ToApiValue());
}

public record MyHoldResponse(Guid HoldId, Guid ClassId, string ClassName, string Status, DateTimeOffset ExpiresAt)
{
    public static MyHoldResponse From(Hold h) =>
        new(h.Id, h.ClassId, h.Class?.Name ?? string.Empty, h.Status.ToApiValue(), h.ExpiresAt);
}
