namespace SchoolAdmission.Api.Options;

public class AdmissionOptions
{
    public const int DefaultHoldDurationSeconds = 600;

    /// <summary>How long a seat stays on hold before it is released. Read from HOLD_DURATION_SECONDS.</summary>
    public int HoldDurationSeconds { get; set; } = DefaultHoldDurationSeconds;

    public TimeSpan HoldDuration => TimeSpan.FromSeconds(HoldDurationSeconds);
}
