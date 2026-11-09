using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Domain;
using SchoolAdmission.Api.Options;

namespace SchoolAdmission.Api.Services;

/// <summary>
/// Releases seats of holds whose time has run out, without waiting for anyone to call the API.
/// Safe to run in several API processes at once: each class is expired under its row lock,
/// so a hold is only ever expired (and its seat released) once.
/// </summary>
public class HoldExpiryService(
    IServiceScopeFactory scopeFactory,
    TimeProvider clock,
    IOptions<AdmissionOptions> options,
    ILogger<HoldExpiryService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(options.Value.ExpirySweepInterval, clock);

        do
        {
            try
            {
                await SweepAsync(stoppingToken);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                // A failed sweep (e.g. database briefly unavailable) is retried on the next tick.
                logger.LogWarning(e, "Hold expiry sweep failed");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    public async Task<int> SweepAsync(CancellationToken ct)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
        var holds = scope.ServiceProvider.GetRequiredService<HoldService>();

        var now = clock.GetUtcNow();
        var classIds = await db.Holds
            .Where(h => h.Status == HoldStatus.Held && h.ExpiresAt <= now)
            .Select(h => h.ClassId)
            .Distinct()
            .ToListAsync(ct);

        var total = 0;
        foreach (var classId in classIds)
        {
            total += await holds.ExpireOverdueHoldsAsync(classId, ct);
        }

        if (total > 0)
        {
            logger.LogInformation("Expired {Count} hold(s)", total);
        }

        return total;
    }
}
