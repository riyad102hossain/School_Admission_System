using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Contracts;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Domain;
using SchoolAdmission.Api.Errors;

namespace SchoolAdmission.Api.Endpoints;

public static class ClassEndpoints
{
    private const int MaxNameLength = 200;

    public static IEndpointRouteBuilder MapClassEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/classes", CreateClass);
        app.MapGet("/classes", GetClasses);
        app.MapGet("/classes/{classId:guid}", GetClass);
        return app;
    }

    private static async Task<Created<ClassResponse>> CreateClass(
        CreateClassRequest request, AdmissionDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            throw ApiException.Validation("Class name is required.");
        }
        if (name.Length > MaxNameLength)
        {
            throw ApiException.Validation($"Class name must be at most {MaxNameLength} characters.");
        }
        if (request.TotalSeats is null)
        {
            throw ApiException.Validation("totalSeats is required.");
        }
        if (request.TotalSeats < 1)
        {
            throw ApiException.Validation("totalSeats must be at least 1.");
        }

        var schoolClass = new SchoolClass
        {
            Id = Guid.NewGuid(),
            Name = name,
            TotalSeats = request.TotalSeats.Value,
            CreatedAt = clock.GetUtcNow()
        };
        db.Classes.Add(schoolClass);
        await db.SaveChangesAsync(ct);

        return TypedResults.Created($"/classes/{schoolClass.Id}", ClassResponse.From(schoolClass));
    }

    private static async Task<Ok<List<ClassResponse>>> GetClasses(AdmissionDbContext db, CancellationToken ct)
    {
        var classes = await db.Classes
            .AsNoTracking()
            .OrderBy(c => c.CreatedAt)
            .ToListAsync(ct);

        return TypedResults.Ok(classes.Select(ClassResponse.From).ToList());
    }

    private static async Task<Ok<ClassResponse>> GetClass(Guid classId, AdmissionDbContext db, CancellationToken ct)
    {
        var schoolClass = await db.Classes.AsNoTracking().SingleOrDefaultAsync(c => c.Id == classId, ct)
            ?? throw ApiException.NotFound(ErrorCodes.ClassNotFound, "Class not found.");

        return TypedResults.Ok(ClassResponse.From(schoolClass));
    }
}
