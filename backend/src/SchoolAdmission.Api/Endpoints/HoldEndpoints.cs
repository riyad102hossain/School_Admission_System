using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.Contracts;
using SchoolAdmission.Api.Errors;
using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.Endpoints;

public static class HoldEndpoints
{
    public static IEndpointRouteBuilder MapHoldEndpoints(this IEndpointRouteBuilder app)
    {
        var holds = app.MapGroup("").WithTags("Holds");

        holds.MapPost("/classes/{classId:guid}/holds", CreateHold)
            .WithSummary("Hold a seat for a student")
            .WithDescription("Returns 409 when the class is full or the student already has an active application for it.")
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces<ErrorResponse>(StatusCodes.Status404NotFound)
            .Produces<ErrorResponse>(StatusCodes.Status409Conflict);

        holds.MapGet("/holds/{holdId:guid}", GetHold)
            .WithSummary("Get the status of a hold")
            .Produces<ErrorResponse>(StatusCodes.Status404NotFound);

        holds.MapPost("/holds/{holdId:guid}/confirm", ConfirmHold)
            .WithSummary("Confirm (pay for) a held seat")
            .WithDescription("Idempotent: confirming an already confirmed hold returns 200 again. Expired or cancelled holds return 409.")
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces<ErrorResponse>(StatusCodes.Status403Forbidden)
            .Produces<ErrorResponse>(StatusCodes.Status404NotFound)
            .Produces<ErrorResponse>(StatusCodes.Status409Conflict);

        holds.MapDelete("/holds/{holdId:guid}", CancelHold)
            .WithSummary("Cancel a held seat")
            .WithDescription("Releases the seat. A confirmed hold cannot be cancelled (409).")
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces<ErrorResponse>(StatusCodes.Status403Forbidden)
            .Produces<ErrorResponse>(StatusCodes.Status404NotFound)
            .Produces<ErrorResponse>(StatusCodes.Status409Conflict);

        holds.MapGet("/me/holds", GetMyHolds)
            .WithSummary("List the student's applications, newest first")
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest);

        return app;
    }

    private static async Task<Created<CreateHoldResponse>> CreateHold(
        Guid classId,
        [FromHeader(Name = StudentIdHeader.Name)] string? studentIdHeader,
        HoldService holds,
        CancellationToken ct)
    {
        var studentId = StudentIdHeader.Require(studentIdHeader);
        var hold = await holds.CreateAsync(classId, studentId, ct);
        return TypedResults.Created($"/holds/{hold.Id}", CreateHoldResponse.From(hold));
    }

    private static async Task<Ok<HoldResponse>> GetHold(Guid holdId, HoldService holds, CancellationToken ct)
    {
        var hold = await holds.GetAsync(holdId, ct);
        return TypedResults.Ok(HoldResponse.From(hold));
    }

    private static async Task<Ok<ConfirmHoldResponse>> ConfirmHold(
        Guid holdId,
        [FromHeader(Name = StudentIdHeader.Name)] string? studentIdHeader,
        HoldService holds,
        CancellationToken ct)
    {
        var studentId = StudentIdHeader.Require(studentIdHeader);
        var hold = await holds.ConfirmAsync(holdId, studentId, ct);
        return TypedResults.Ok(ConfirmHoldResponse.From(hold));
    }

    private static async Task<NoContent> CancelHold(
        Guid holdId,
        [FromHeader(Name = StudentIdHeader.Name)] string? studentIdHeader,
        HoldService holds,
        CancellationToken ct)
    {
        var studentId = StudentIdHeader.Require(studentIdHeader);
        await holds.CancelAsync(holdId, studentId, ct);
        return TypedResults.NoContent();
    }

    private static async Task<Ok<List<MyHoldResponse>>> GetMyHolds(
        [FromHeader(Name = StudentIdHeader.Name)] string? studentIdHeader,
        HoldService holds,
        CancellationToken ct)
    {
        var studentId = StudentIdHeader.Require(studentIdHeader);
        var list = await holds.GetForStudentAsync(studentId, ct);
        return TypedResults.Ok(list.Select(MyHoldResponse.From).ToList());
    }
}
