using SchoolAdmission.Api.Domain;

namespace SchoolAdmission.Api.Contracts;

// Fields are nullable so that a missing value reaches validation and gets a clear message.
public record CreateClassRequest(string? Name, int? TotalSeats);

public record ClassResponse(
    Guid Id,
    string Name,
    int TotalSeats,
    int HeldSeats,
    int ConfirmedSeats,
    int AvailableSeats)
{
    public static ClassResponse From(SchoolClass c) =>
        new(c.Id, c.Name, c.TotalSeats, c.HeldSeats, c.ConfirmedSeats, c.AvailableSeats);
}
