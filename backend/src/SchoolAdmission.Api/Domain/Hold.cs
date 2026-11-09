namespace SchoolAdmission.Api.Domain;

/// <summary>
/// An application for a seat. Starts as Held and moves to Confirmed (fee paid),
/// Expired (time ran out) or Cancelled (withdrawn by the student).
/// </summary>
public class Hold
{
    public Guid Id { get; set; }
    public Guid ClassId { get; set; }
    public SchoolClass? Class { get; set; }

    /// <summary>17-digit birth registration number of the student.</summary>
    public required string StudentId { get; set; }

    public HoldStatus Status { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ConfirmedAt { get; set; }
    public DateTimeOffset? ClosedAt { get; set; }
}
