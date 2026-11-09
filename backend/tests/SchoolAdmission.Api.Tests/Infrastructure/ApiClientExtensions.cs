using System.Net;
using System.Net.Http.Json;
using SchoolAdmission.Api.Contracts;
using SchoolAdmission.Api.Errors;

namespace SchoolAdmission.Api.Tests.Infrastructure;

public static class ApiClientExtensions
{
    private static long _nextStudent = 10_000_000_000_000_000;

    /// <summary>A fresh, valid 17-digit student ID that no other test uses.</summary>
    public static string NewStudentId() => Interlocked.Increment(ref _nextStudent).ToString();

    public static async Task<ClassResponse> CreateClassAsync(this HttpClient client, int totalSeats, string name = "Class 6 - Morning")
    {
        var response = await client.PostAsJsonAsync("/classes", new { name, totalSeats });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ClassResponse>())!;
    }

    public static async Task<ClassResponse> GetClassAsync(this HttpClient client, Guid classId) =>
        (await client.GetFromJsonAsync<ClassResponse>($"/classes/{classId}"))!;

    public static Task<HttpResponseMessage> HoldAsync(this HttpClient client, Guid classId, string studentId) =>
        client.SendAsStudentAsync(HttpMethod.Post, $"/classes/{classId}/holds", studentId);

    public static async Task<CreateHoldResponse> HoldSuccessfullyAsync(this HttpClient client, Guid classId, string studentId)
    {
        var response = await client.HoldAsync(classId, studentId);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<CreateHoldResponse>())!;
    }

    public static Task<HttpResponseMessage> ConfirmAsync(this HttpClient client, Guid holdId, string studentId) =>
        client.SendAsStudentAsync(HttpMethod.Post, $"/holds/{holdId}/confirm", studentId);

    public static Task<HttpResponseMessage> CancelAsync(this HttpClient client, Guid holdId, string studentId) =>
        client.SendAsStudentAsync(HttpMethod.Delete, $"/holds/{holdId}", studentId);

    public static async Task<string> ReadErrorCodeAsync(this HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<ErrorResponse>())!.Error;

    public static Task<HttpResponseMessage> SendAsStudentAsync(this HttpClient client, HttpMethod method, string url, string? studentId)
    {
        var request = new HttpRequestMessage(method, url);
        if (studentId is not null)
        {
            request.Headers.Add("X-Student-Id", studentId);
        }
        return client.SendAsync(request);
    }
}
