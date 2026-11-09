namespace SchoolAdmission.Api.Domain;

public enum HoldStatus
{
    Held,
    Confirmed,
    Expired,
    Cancelled
}

public static class HoldStatusExtensions
{
    /// <summary>The value used in the API and the database, e.g. "HELD".</summary>
    public static string ToApiValue(this HoldStatus status) => status.ToString().ToUpperInvariant();
}
