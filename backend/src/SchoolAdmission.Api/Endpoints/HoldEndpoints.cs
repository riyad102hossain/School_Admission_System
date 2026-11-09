using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.Contracts;
using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.Endpoints;

public static class HoldEndpoints
{
    public static IEndpointRouteBuilder MapHoldEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/classes/{classId:guid}/holds", CreateHold);
        app.MapGet("/holds/{holdId:guid}", GetHold);
        app.MapPost("/holds/{holdId:guid}/confirm", ConfirmHold);
        app.MapDelete("/holds/{holdId:guid}", CancelHold);
        app.MapGet("/me/holds", GetMyHolds);
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
