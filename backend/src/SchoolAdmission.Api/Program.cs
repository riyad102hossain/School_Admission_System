using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Options;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException(
        "Database connection string is missing. Set the ConnectionStrings__Default environment variable.");

builder.Services.AddDbContext<AdmissionDbContext>(options =>
    options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention());

var holdDurationSeconds = builder.Configuration.GetValue("HOLD_DURATION_SECONDS", AdmissionOptions.DefaultHoldDurationSeconds);
if (holdDurationSeconds <= 0)
{
    throw new InvalidOperationException("HOLD_DURATION_SECONDS must be a positive number of seconds.");
}
builder.Services.Configure<AdmissionOptions>(o => o.HoldDurationSeconds = holdDurationSeconds);

builder.Services.AddSingleton(TimeProvider.System);

// The API is public and uses no cookies, so any origin may call it.
// The frontend runs on a different port, which makes CORS necessary.
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddHealthChecks();

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
    await db.Database.MigrateAsync();
}

app.UseCors();

app.MapHealthChecks("/health");

app.Run();

public partial class Program;
