using System.Net;
using System.Text;
using SchoolAdmission.Api.Tests.Infrastructure;

namespace SchoolAdmission.Api.Tests;

[Collection(DatabaseCollection.Name)]
public class ValidationTests(DatabaseFixture fixture)
{
    private readonly HttpClient _client = fixture.Api.CreateClient();

    [Theory]
    [InlineData("""{"name":"","totalSeats":5}""")]
    [InlineData("""{"name":"   ","totalSeats":5}""")]
    [InlineData("""{"totalSeats":5}""")]
    [InlineData("""{"name":"Class 6","totalSeats":0}""")]
    [InlineData("""{"name":"Class 6","totalSeats":-3}""")]
    [InlineData("""{"name":"Class 6"}""")]
    [InlineData("""{"name":"Class 6","totalSeats":"many"}""")]
    [InlineData("""{"name":"Class 6","totalSeats":2.5}""")]
    [InlineData("""{"name":"Class 6","totalSeats":99999999999}""")]
    [InlineData("""{"name":"Class 6",""")]
    [InlineData("""[]""")]
    [InlineData("")]
    public async Task Invalid_class_body_returns_400(string body)
    {
        var response = await _client.PostAsync("/classes", new StringContent(body, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False(string.IsNullOrEmpty(await response.ReadErrorCodeAsync()));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("1234567890123456")]
    [InlineData("123456789012345678")]
    [InlineData("1234567890123456a")]
    [InlineData("-1234567890123456")]
    public async Task Invalid_student_id_returns_400(string? studentId)
    {
        var schoolClass = await _client.CreateClassAsync(totalSeats: 5);

        var response = await _client.SendAsStudentAsync(HttpMethod.Post, $"/classes/{schoolClass.Id}/holds", studentId);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("INVALID_STUDENT_ID", await response.ReadErrorCodeAsync());
        Assert.Equal(0, (await _client.GetClassAsync(schoolClass.Id)).HeldSeats);
    }

    [Theory]
    [InlineData("GET", "/classes/00000000-0000-0000-0000-000000000000")]
    [InlineData("GET", "/classes/not-a-guid")]
    [InlineData("GET", "/holds/00000000-0000-0000-0000-000000000000")]
    [InlineData("POST", "/classes/00000000-0000-0000-0000-000000000000/holds")]
    [InlineData("POST", "/holds/00000000-0000-0000-0000-000000000000/confirm")]
    [InlineData("DELETE", "/holds/00000000-0000-0000-0000-000000000000")]
    public async Task Unknown_resource_returns_404(string method, string url)
    {
        var response = await _client.SendAsStudentAsync(new HttpMethod(method), url, ApiClientExtensions.NewStudentId());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Non_json_body_returns_415_not_500()
    {
        var response = await _client.PostAsync("/classes", new StringContent("name=Class 6", Encoding.UTF8, "text/plain"));

        Assert.Equal(HttpStatusCode.UnsupportedMediaType, response.StatusCode);
    }
}
