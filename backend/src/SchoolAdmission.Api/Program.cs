using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Data;
using Microsoft.AspNetCore.WebUtilities;
using SchoolAdmission.Api.Endpoints;
using SchoolAdmission.Api.Errors;
using SchoolAdmission.Api.Options;
using SchoolAdmission.Api.Services;

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
var sweepIntervalSeconds = builder.Configuration.GetValue("EXPIRY_SWEEP_INTERVAL_SECONDS", AdmissionOptions.DefaultExpirySweepIntervalSeconds);
if (sweepIntervalSeconds <= 0)
{
    throw new InvalidOperationException("EXPIRY_SWEEP_INTERVAL_SECONDS must be a positive number of seconds.");
}
builder.Services.Configure<AdmissionOptions>(o =>
{
    o.HoldDurationSeconds = holdDurationSeconds;
    o.ExpirySweepIntervalSeconds = sweepIntervalSeconds;
});

builder.Services.AddSingleton(TimeProvider.System);

// The API is public and uses no cookies, so any origin may call it.
// The frontend runs on a different port, which makes CORS necessary.
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddHealthChecks();
builder.Services.AddScoped<HoldService>();
builder.Services.AddHostedService<HoldExpiryService>();

// Malformed requests (bad JSON, wrong field types) raise an exception so that
// ApiExceptionHandler can answer them with the same error body as everything else.
builder.Services.Configure<RouteHandlerOptions>(o => o.ThrowOnBadRequest = true);
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddProblemDetails();

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
    await db.Database.MigrateAsync();
}

app.UseCors();
app.UseExceptionHandler();
app.UseStatusCodePages(async context =>
{
    var response = context.HttpContext.Response;
    var body = response.StatusCode switch
    {
        StatusCodes.Status404NotFound => new ErrorResponse(ErrorCodes.NotFound, "The requested resource was not found."),
        StatusCodes.Status415UnsupportedMediaType => new ErrorResponse(ErrorCodes.BadRequest, "Request body must be JSON (Content-Type: application/json)."),
        StatusCodes.Status405MethodNotAllowed => new ErrorResponse(ErrorCodes.BadRequest, "This HTTP method is not allowed here."),
        _ => new ErrorResponse(ErrorCodes.BadRequest, ReasonPhrases.GetReasonPhrase(response.StatusCode))
    };
    await response.WriteAsJsonAsync(body);
});

app.MapHealthChecks("/health");
app.MapClassEndpoints();
app.MapHoldEndpoints();

app.Run();

public partial class Program;
