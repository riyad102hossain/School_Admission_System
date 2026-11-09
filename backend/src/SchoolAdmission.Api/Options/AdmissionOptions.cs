namespace SchoolAdmission.Api.Options;

public class AdmissionOptions
{
    public const int DefaultHoldDurationSeconds = 600;
    public const int DefaultExpirySweepIntervalSeconds = 2;

    /// <summary>How long a seat stays on hold before it is released. Read from HOLD_DURATION_SECONDS.</summary>
    public int HoldDurationSeconds { get; set; } = DefaultHoldDurationSeconds;

    /// <summary>How often overdue holds are released in the background. Read from EXPIRY_SWEEP_INTERVAL_SECONDS.</summary>
    public int ExpirySweepIntervalSeconds { get; set; } = DefaultExpirySweepIntervalSeconds;

    public TimeSpan HoldDuration => TimeSpan.FromSeconds(HoldDurationSeconds);
    public TimeSpan ExpirySweepInterval => TimeSpan.FromSeconds(ExpirySweepIntervalSeconds);
}
