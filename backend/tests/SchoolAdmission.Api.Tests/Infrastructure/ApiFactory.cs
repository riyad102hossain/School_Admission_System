using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Time.Testing;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.Tests.Infrastructure;

/// <summary>
/// One running instance of the API, connected to the test database. Time is controlled
/// by <see cref="Clock"/>, so expiry can be tested without waiting.
/// </summary>
public class ApiFactory(string connectionString) : WebApplicationFactory<Program>
{
    public const int HoldDurationSeconds = 60;

    public FakeTimeProvider Clock { get; } = new(DateTimeOffset.UtcNow);

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Default", connectionString);
        builder.UseSetting("HOLD_DURATION_SECONDS", HoldDurationSeconds.ToString());

        builder.ConfigureTestServices(services => services.AddSingleton<TimeProvider>(Clock));
    }

    /// <summary>Moves time past the hold duration, so every hold created before now is overdue.</summary>
    public void SkipPastHoldDuration() => Clock.Advance(TimeSpan.FromSeconds(HoldDurationSeconds + 1));

    /// <summary>Runs one pass of the background expiry job, as the timer would.</summary>
    public Task<int> RunExpirySweepAsync() =>
        Services.GetServices<IHostedService>().OfType<HoldExpiryService>().Single().SweepAsync(CancellationToken.None);

    public async Task<T> QueryDbAsync<T>(Func<AdmissionDbContext, Task<T>> query)
    {
        await using var scope = Services.CreateAsyncScope();
        return await query(scope.ServiceProvider.GetRequiredService<AdmissionDbContext>());
    }
}
