using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Domain;
using SchoolAdmission.Api.Errors;
using SchoolAdmission.Api.Options;

namespace SchoolAdmission.Api.Services;

/// <summary>
/// Seat holding rules. Every change to a class's seats happens inside a transaction that
/// first locks the class row (SELECT ... FOR UPDATE). Requests for the same class are
/// therefore processed one at a time by PostgreSQL, even across several API processes,
/// and the class row is always locked before any of its holds, which avoids deadlocks.
/// </summary>
public class HoldService(AdmissionDbContext db, TimeProvider clock, IOptions<AdmissionOptions> options)
{
    private const string UniqueViolation = "23505";

    public async Task<Hold> CreateAsync(Guid classId, string studentId, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var schoolClass = await LockClassAsync(classId, ct)
            ?? throw ApiException.NotFound(ErrorCodes.ClassNotFound, "Class not found.");

        var now = Now();
        await ExpireOverdueHoldsAsync(schoolClass, now, ct);

        var alreadyActive = await db.Holds.AnyAsync(h =>
            h.ClassId == classId &&
            h.StudentId == studentId &&
            (h.Status == HoldStatus.Held || h.Status == HoldStatus.Confirmed), ct);
        if (alreadyActive)
        {
            throw ApiException.Conflict(ErrorCodes.AlreadyApplied,
                "This student already has an active application for this class.");
        }

        if (schoolClass.AvailableSeats <= 0)
        {
            throw ApiException.Conflict(ErrorCodes.NoSeatsAvailable, "No seats are available in this class.");
        }

        var hold = new Hold
        {
            Id = Guid.NewGuid(),
            ClassId = classId,
            StudentId = studentId,
            Status = HoldStatus.Held,
            CreatedAt = now,
            ExpiresAt = now + options.Value.HoldDuration
        };
        db.Holds.Add(hold);
        schoolClass.HeldSeats++;

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: UniqueViolation })
        {
            // Backstop for the unique index; the class lock above normally prevents this.
            throw ApiException.Conflict(ErrorCodes.AlreadyApplied,
                "This student already has an active application for this class.");
        }

        await transaction.CommitAsync(ct);
        return hold;
    }

    public async Task<Hold> GetAsync(Guid holdId, CancellationToken ct)
    {
        var hold = await FindAsync(holdId, ct);

        if (hold.Status == HoldStatus.Held && hold.ExpiresAt <= Now())
        {
            await ExpireOverdueHoldsAsync(hold.ClassId, ct);
            hold = await FindAsync(holdId, ct);
        }

        return hold;
    }

    /// <summary>Confirms (pays for) a held seat. Confirming an already confirmed hold is a no-op.</summary>
    public async Task<Hold> ConfirmAsync(Guid holdId, string studentId, CancellationToken ct)
    {
        var existing = await FindOwnedAsync(holdId, studentId, ct);

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var schoolClass = await LockClassAsync(existing.ClassId, ct)
            ?? throw ApiException.NotFound(ErrorCodes.HoldNotFound, "Application not found.");

        var now = Now();
        await ExpireOverdueHoldsAsync(schoolClass, now, ct);

        var hold = await db.Holds.SingleAsync(h => h.Id == holdId, ct);
        switch (hold.Status)
        {
            case HoldStatus.Confirmed:
                return hold;
            case HoldStatus.Expired:
                throw ApiException.Conflict(ErrorCodes.HoldExpired, "This application has expired. Please apply again.");
            case HoldStatus.Cancelled:
                throw ApiException.Conflict(ErrorCodes.HoldCancelled, "This application was cancelled.");
        }

        hold.Status = HoldStatus.Confirmed;
        hold.ConfirmedAt = now;
        schoolClass.HeldSeats--;
        schoolClass.ConfirmedSeats++;

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return hold;
    }

    /// <summary>
    /// Withdraws a held application and frees its seat. Cancelling an application that is
    /// already cancelled or expired is a no-op; a confirmed (paid) application cannot be cancelled.
    /// </summary>
    public async Task CancelAsync(Guid holdId, string studentId, CancellationToken ct)
    {
        var existing = await FindOwnedAsync(holdId, studentId, ct);

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var schoolClass = await LockClassAsync(existing.ClassId, ct)
            ?? throw ApiException.NotFound(ErrorCodes.HoldNotFound, "Application not found.");

        var now = Now();
        await ExpireOverdueHoldsAsync(schoolClass, now, ct);

        var hold = await db.Holds.SingleAsync(h => h.Id == holdId, ct);
        switch (hold.Status)
        {
            case HoldStatus.Cancelled:
            case HoldStatus.Expired:
                return;
            case HoldStatus.Confirmed:
                throw ApiException.Conflict(ErrorCodes.AlreadyConfirmed,
                    "This application is already confirmed and cannot be cancelled.");
        }

        hold.Status = HoldStatus.Cancelled;
        hold.ClosedAt = now;
        schoolClass.HeldSeats--;

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    public async Task<List<Hold>> GetForStudentAsync(string studentId, CancellationToken ct)
    {
        var now = Now();
        var classesWithOverdueHolds = await db.Holds
            .Where(h => h.StudentId == studentId && h.Status == HoldStatus.Held && h.ExpiresAt <= now)
            .Select(h => h.ClassId)
            .Distinct()
            .ToListAsync(ct);

        foreach (var classId in classesWithOverdueHolds)
        {
            await ExpireOverdueHoldsAsync(classId, ct);
        }

        return await db.Holds
            .AsNoTracking()
            .Include(h => h.Class)
            .Where(h => h.StudentId == studentId)
            .OrderByDescending(h => h.CreatedAt)
            .ToListAsync(ct);
    }

    /// <summary>Marks every overdue hold of a class as expired and gives the seats back.</summary>
    /// <returns>The number of holds that were expired.</returns>
    public async Task<int> ExpireOverdueHoldsAsync(Guid classId, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var schoolClass = await LockClassAsync(classId, ct);
        if (schoolClass is null)
        {
            return 0;
        }

        var expired = await ExpireOverdueHoldsAsync(schoolClass, Now(), ct);
        await transaction.CommitAsync(ct);
        return expired;
    }

    // Must be called inside a transaction, after the class row has been locked.
    private async Task<int> ExpireOverdueHoldsAsync(SchoolClass schoolClass, DateTimeOffset now, CancellationToken ct)
    {
        var expired = await db.Holds
            .Where(h => h.ClassId == schoolClass.Id && h.Status == HoldStatus.Held && h.ExpiresAt <= now)
            .ExecuteUpdateAsync(s => s
                .SetProperty(h => h.Status, HoldStatus.Expired)
                .SetProperty(h => h.ClosedAt, now), ct);

        if (expired > 0)
        {
            schoolClass.HeldSeats -= expired;
            await db.SaveChangesAsync(ct);
        }

        return expired;
    }

    // PostgreSQL stores timestamps with microsecond precision; trimming here keeps the
    // value returned on create identical to the one returned by later reads.
    private DateTimeOffset Now()
    {
        var now = clock.GetUtcNow();
        return now.AddTicks(-(now.Ticks % (TimeSpan.TicksPerMillisecond / 1000)));
    }

    private async Task<SchoolClass?> LockClassAsync(Guid classId, CancellationToken ct)
    {
        var rows = await db.Classes
            .FromSql($"SELECT * FROM classes WHERE id = {classId} FOR UPDATE")
            .ToListAsync(ct);
        return rows.SingleOrDefault();
    }

    private async Task<Hold> FindAsync(Guid holdId, CancellationToken ct) =>
        await db.Holds.AsNoTracking().SingleOrDefaultAsync(h => h.Id == holdId, ct)
        ?? throw ApiException.NotFound(ErrorCodes.HoldNotFound, "Application not found.");

    private async Task<Hold> FindOwnedAsync(Guid holdId, string studentId, CancellationToken ct)
    {
        var hold = await FindAsync(holdId, ct);
        if (hold.StudentId != studentId)
        {
            throw ApiException.Forbidden(ErrorCodes.NotYourHold, "This application belongs to a different student.");
        }

        return hold;
    }
}
