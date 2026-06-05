using PanoramaMusic.Api.Middleware;
using PanoramaMusic.Api.Routes;
using PanoramaMusic.Api.Routes.Identity;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using PanoramaMusic.Infrastructure.Extensions;
using PanoramaMusic.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

if (builder.Environment.IsDevelopment())
{
	builder.Services.AddOpenApi();
}

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
	throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");
}

builder.Services.AddInfrastructure(connectionString);
builder.Services.AddIdentityInfrastructure(connectionString);
builder.Services.AddExceptionHandler<DomainExceptionHandler>();
builder.Services.AddProblemDetails();

var app = builder.Build();

var resetDatabase = string.Equals(
	builder.Configuration["RESET_DB"],
	"true",
	StringComparison.OrdinalIgnoreCase);

if (resetDatabase)
{
	DatabaseMigrator.Reset(connectionString);
}

DatabaseMigrator.Run(connectionString, ensureDatabase: app.Environment.IsDevelopment());

if (app.Environment.IsDevelopment())
{
	app.MapOpenApi();
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseExceptionHandler();

app.MapHealthRoutes();
app.MapAuthRoutes();

// Return 404 for unmatched /api/* routes so typos don't silently return the SPA
app.MapFallback("/api/{**path}", () => Results.NotFound());

// SPA fallback: serve index.html for all other unmatched routes
app.MapFallbackToFile("index.html");

app.Run();

public partial class Program { }