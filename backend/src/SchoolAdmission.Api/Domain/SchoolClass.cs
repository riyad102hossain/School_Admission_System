namespace SchoolAdmission.Api.Domain;

/// <summary>
/// A single class/shift with a fixed number of seats, e.g. "Class 6 - Morning Shift".
/// Seat counters are stored on the row and only changed while the row is locked,
/// so held + confirmed can never exceed TotalSeats (also enforced by a check constraint).
/// </summary>
public class SchoolClass
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public int TotalSeats { get; set; }
    public int HeldSeats { get; set; }
    public int ConfirmedSeats { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public int AvailableSeats => TotalSeats - HeldSeats - ConfirmedSeats;

    public List<Hold> Holds { get; set; } = [];
}
