using System.Net;
using System.Net.Http.Json;
using SchoolAdmission.Api.Contracts;
using SchoolAdmission.Api.Tests.Infrastructure;

namespace SchoolAdmission.Api.Tests;

[Collection(DatabaseCollection.Name)]
public class HoldRulesTests(DatabaseFixture fixture)
{
    private readonly ApiFactory _api = fixture.Api;
    private readonly HttpClient _client = fixture.Api.CreateClient();

    [Fact]
    public async Task Hold_returns_contract_fields_and_expires_after_the_configured_duration()
    {
        var schoolClass = await _client.CreateClassAsync(totalSeats: 5);
        var studentId = ApiClientExtensions.NewStudentId();

        var hold = await _client.HoldSuccessfullyAsync(schoolClass.Id, studentId);

        Assert.Equal(schoolClass.Id, hold.ClassId);
        Assert.Equal(studentId, hold.StudentId);
        Assert.Equal("HELD", hold.Status);
        Assert.Equal(_api.Clock.GetUtcNow().AddSeconds(ApiFactory.HoldDurationSeconds), hold.ExpiresAt, TimeSpan.FromSeconds(1));

        var after = await _client.GetClassAsync(schoolClass.Id);
        Assert.Equal((1, 0, 4), (after.HeldSeats, after.ConfirmedSeats, after.AvailableSeats));
    }

    [Fact]
    public async Task Timestamps_are_utc_with_a_trailing_z_like_the_contract_example()
    {
        var schoolClass = await _client.CreateClassAsync(totalSeats: 5);
        var request = new HttpRequestMessage(HttpMethod.Post, $"/classes/{schoolClass.Id}/holds");
        request.Headers.Add("X-Student-Id", ApiClientExtensions.NewStudentId());

        var response = await _client.SendAsync(request);
        var json = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var expiresAt = json.GetProperty("expiresAt").GetString()!;

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.EndsWith("Z", expiresAt);
        Assert.DoesNotContain("+", expiresAt);
    }

    [Fact]
    public async Task Confirming_twice_is_idempotent()
    {
        var schoolClass = await _client.CreateClassAsync(totalSeats: 5);
        var studentId = ApiClientExtensions.NewStudentId();
        var hold = await _client.HoldSuccessfullyAsync(schoolClass.Id, studentId);

        var first = await _client.ConfirmAsync(hold.HoldId, studentId);
        var second = await _client.ConfirmAsync(hold.HoldId, studentId);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        var body = await second.Content.ReadFromJsonAsync<ConfirmHoldResponse>();
        Assert.Equal(new ConfirmHoldResponse(hold.HoldId, "CONFIRMED"), body);

        var after = await _client.GetClassAsync(schoolClass.Id);
        Assert.Equal((0, 1), (after.HeldSeats, after.ConfirmedSeats));
    }

    [Fact]
    public async Task Expired_hold_cannot_be_confirmed_and_its_seat_is_released()
    {
        var schoolClass = await _client.CreateClassAsync(totalSeats: 1);
        var studentId = ApiClientExtensions.NewStudentId();
        var hold = await _client.HoldSuccessfullyAsync(schoolClass.Id, studentId);

        _api.SkipPastHoldDuration();
        var response = await _client.ConfirmAsync(hold.HoldId, studentId);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("HOLD_EXPIRED", await response.ReadErrorCodeAsync());
        var status = await _client.GetFromJsonAsync<HoldResponse>($"/holds/{hold.HoldId}");
        Assert.Equal("EXPIRED", status!.Status);
        Assert.Equal(1, (await _client.GetClassAsync(schoolClass.Id)).AvailableSeats);
    }

    [Fact]
    public async Task Background_job_releases_expired_seats_without_any_request()
    {
        var schoolClass = await _client.CreateClassAsync(totalSeats: 2);
        await _client.HoldSuccessfullyAsync(schoolClass.Id, ApiClientExtensions.NewStudentId());
        await _client.HoldSuccessfullyAsync(schoolClass.Id, ApiClientExtensions.NewStudentId());

        _api.SkipPastHoldDuration();
        await _api.RunExpirySweepAsync();

        // GET /classes/{id} only reads the counters, so this proves the job updated them.
        var after = await _client.GetClassAsync(schoolClass.Id);
        Assert.Equal((0, 2), (after.HeldSeats, after.AvailableSeats));
    }

    [Fact]
    public async Task Student_cannot_hold_the_same_class_twice_but_can_apply_again_after_cancelling()
    {
        var schoolClass = await _client.CreateClassAsync(totalSeats: 5);
        var studentId = ApiClientExtensions.NewStudentId();
        var hold = await _client.HoldSuccessfullyAsync(schoolClass.Id, studentId);

        var duplicate = await _client.HoldAsync(schoolClass.Id, studentId);
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        Assert.Equal("ALREADY_APPLIED", await duplicate.ReadErrorCodeAsync());

        var cancel = await _client.CancelAsync(hold.HoldId, studentId);
        Assert.Equal(HttpStatusCode.NoContent, cancel.StatusCode);
        Assert.Equal(0, (await _client.GetClassAsync(schoolClass.Id)).HeldSeats);

        await _client.HoldSuccessfullyAsync(schoolClass.Id, studentId);
    }

    [Fact]
    public async Task Only_the_owner_can_confirm_or_cancel_a_hold()
    {
        var schoolClass = await _client.CreateClassAsync(totalSeats: 5);
        var owner = ApiClientExtensions.NewStudentId();
        var someoneElse = ApiClientExtensions.NewStudentId();
        var hold = await _client.HoldSuccessfullyAsync(schoolClass.Id, owner);

        var confirm = await _client.ConfirmAsync(hold.HoldId, someoneElse);
        var cancel = await _client.CancelAsync(hold.HoldId, someoneElse);

        Assert.Equal(HttpStatusCode.Forbidden, confirm.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, cancel.StatusCode);
        Assert.Equal(1, (await _client.GetClassAsync(schoolClass.Id)).HeldSeats);
    }

    [Fact]
    public async Task Confirmed_hold_cannot_be_cancelled()
    {
        var schoolClass = await _client.CreateClassAsync(totalSeats: 5);
        var studentId = ApiClientExtensions.NewStudentId();
        var hold = await _client.HoldSuccessfullyAsync(schoolClass.Id, studentId);
        await _client.ConfirmAsync(hold.HoldId, studentId);

        var cancel = await _client.CancelAsync(hold.HoldId, studentId);

        Assert.Equal(HttpStatusCode.Conflict, cancel.StatusCode);
        Assert.Equal(1, (await _client.GetClassAsync(schoolClass.Id)).ConfirmedSeats);
    }

    [Fact]
    public async Task My_holds_lists_the_students_applications_with_class_name()
    {
        var schoolClass = await _client.CreateClassAsync(totalSeats: 5, name: "Class 9 - Day Shift");
        var studentId = ApiClientExtensions.NewStudentId();
        var hold = await _client.HoldSuccessfullyAsync(schoolClass.Id, studentId);
        await _client.HoldSuccessfullyAsync(schoolClass.Id, ApiClientExtensions.NewStudentId()); // another student's

        var response = await _client.SendAsStudentAsync(HttpMethod.Get, "/me/holds", studentId);
        var holds = await response.Content.ReadFromJsonAsync<List<MyHoldResponse>>();

        var mine = Assert.Single(holds!);
        Assert.Equal(new MyHoldResponse(hold.HoldId, schoolClass.Id, "Class 9 - Day Shift", "HELD", hold.ExpiresAt), mine);
    }
}
