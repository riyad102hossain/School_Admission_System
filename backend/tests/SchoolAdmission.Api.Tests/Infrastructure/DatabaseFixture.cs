using Testcontainers.PostgreSql;

namespace SchoolAdmission.Api.Tests.Infrastructure;

/// <summary>
/// Starts a throwaway PostgreSQL container (requires Docker) and one API instance on top of it.
/// Shared by every test; each test creates its own classes, so tests don't see each other's data.
/// </summary>
public class DatabaseFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    public ApiFactory Api { get; private set; } = null!;

    // Same pool limit as production, so the tests exercise the same connection pressure.
    public string ConnectionString => _postgres.GetConnectionString() + ";Maximum Pool Size=20";

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        Api = CreateApi();
        Api.CreateClient().Dispose(); // starts the host, which applies migrations
    }

    /// <summary>Creates an additional, independent API instance on the same database.</summary>
    public ApiFactory CreateApi() => new(ConnectionString);

    public async Task DisposeAsync()
    {
        await Api.DisposeAsync();
        await _postgres.DisposeAsync();
    }
}

[CollectionDefinition(Name)]
public class DatabaseCollection : ICollectionFixture<DatabaseFixture>
{
    public const string Name = "Database";
}
