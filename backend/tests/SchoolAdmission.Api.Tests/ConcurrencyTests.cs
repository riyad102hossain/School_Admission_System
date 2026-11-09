using System.Net;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Domain;
using SchoolAdmission.Api.Tests.Infrastructure;

namespace SchoolAdmission.Api.Tests;

[Collection(DatabaseCollection.Name)]
public class ConcurrencyTests(DatabaseFixture fixture)
{
    private const int Seats = 10;
    private const int Students = 200;

    [Fact]
    public async Task Many_students_holding_at_once_never_overbook_the_class()
    {
        var client = fixture.Api.CreateClient();
        var schoolClass = await client.CreateClassAsync(Seats);

        var responses = await Task.WhenAll(Enumerable.Range(0, Students)
            .Select(_ => client.HoldAsync(schoolClass.Id, ApiClientExtensions.NewStudentId())));

        Assert.Equal(Seats, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(Students - Seats, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        await AssertSeatsMatchDatabaseAsync(fixture.Api, schoolClass.Id, expectedHeld: Seats);
    }

    [Fact]
    public async Task Two_api_instances_sharing_the_database_never_overbook_the_class()
    {
        await using var secondApi = fixture.CreateApi();
        var clients = new[] { fixture.Api.CreateClient(), secondApi.CreateClient() };
        var schoolClass = await clients[0].CreateClassAsync(Seats);

        var responses = await Task.WhenAll(Enumerable.Range(0, Students)
            .Select(i => clients[i % 2].HoldAsync(schoolClass.Id, ApiClientExtensions.NewStudentId())));

        Assert.Equal(Seats, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(Students - Seats, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        await AssertSeatsMatchDatabaseAsync(fixture.Api, schoolClass.Id, expectedHeld: Seats);
    }

    [Fact]
    public async Task Same_student_applying_many_times_at_once_gets_only_one_hold()
    {
        var client = fixture.Api.CreateClient();
        var schoolClass = await client.CreateClassAsync(Seats);
        var studentId = ApiClientExtensions.NewStudentId();

        var responses = await Task.WhenAll(Enumerable.Range(0, 20)
            .Select(_ => client.HoldAsync(schoolClass.Id, studentId)));

        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.Created);
        await AssertSeatsMatchDatabaseAsync(fixture.Api, schoolClass.Id, expectedHeld: 1);
    }

    [Fact]
    public async Task Confirming_the_same_hold_many_times_at_once_counts_it_once()
    {
        var client = fixture.Api.CreateClient();
        var schoolClass = await client.CreateClassAsync(Seats);
        var studentId = ApiClientExtensions.NewStudentId();
        var hold = await client.HoldSuccessfullyAsync(schoolClass.Id, studentId);

        var responses = await Task.WhenAll(Enumerable.Range(0, 20)
            .Select(_ => client.ConfirmAsync(hold.HoldId, studentId)));

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
        var after = await client.GetClassAsync(schoolClass.Id);
        Assert.Equal(1, after.ConfirmedSeats);
        Assert.Equal(0, after.HeldSeats);
    }

    // The counters on the class row must agree with the holds actually stored.
    private static async Task AssertSeatsMatchDatabaseAsync(ApiFactory api, Guid classId, int expectedHeld)
    {
        var (schoolClass, heldRows) = await api.QueryDbAsync(async db => (
            await db.Classes.AsNoTracking().SingleAsync(c => c.Id == classId),
            await db.Holds.CountAsync(h => h.ClassId == classId && h.Status == HoldStatus.Held)));

        Assert.Equal(expectedHeld, schoolClass.HeldSeats);
        Assert.Equal(expectedHeld, heldRows);
        Assert.True(schoolClass.HeldSeats + schoolClass.ConfirmedSeats <= schoolClass.TotalSeats);
    }
}
