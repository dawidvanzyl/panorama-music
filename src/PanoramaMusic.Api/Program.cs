using Microsoft.AspNetCore.HttpOverrides;
using PanoramaMusic.Api.Authorization;
using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Api.Middleware;
using PanoramaMusic.Api.Routes;
using PanoramaMusic.Api.Routes.Identity;
using PanoramaMusic.Audit.Infrastructure.Extensions;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using PanoramaMusic.Persistence.Extensions;
using Serilog;
using Serilog.Formatting.Compact;
using System.Text.Json.Serialization;

AppContext.SetSwitch("Npgsql.EnableStoredProcedureCompatMode", true);

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSerilog(loggerConfiguration =>
{
	// Minimum levels come from the Serilog configuration section (appsettings /
	// environment variables) — no hardcoded defaults in code.
	loggerConfiguration
		.ReadFrom.Configuration(builder.Configuration)
		.Enrich.FromLogContext();

	if (builder.Environment.IsDevelopment())
	{
		loggerConfiguration.WriteTo.Console();
	}
	else
	{
		loggerConfiguration.WriteTo.Console(new CompactJsonFormatter());
	}
});

if (builder.Environment.IsDevelopment())
{
	builder.Services.AddOpenApi();
}

var connectionString = builder.Configuration.GetRequiredConnectionString("DefaultConnection");

// Validated up front so a missing migration connection fails fast at startup
// rather than inside InitializeDatabase.
builder.Configuration.GetRequiredConnectionString("Migrations");

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
	options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

	// Render's edge proxy is the sole intermediary in front of the container — there is no
	// additional untrusted hop to defend against — so trust exactly one forwarded hop rather
	// than maintaining an IP/network allowlist for a proxy whose IPs Render doesn't publish.
	options.ForwardLimit = 1;
	options.KnownIPNetworks.Clear();
	options.KnownProxies.Clear();
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddInfrastructure(connectionString);
builder.Services.AddAuditInfrastructure();
builder.Services.AddIdentityInfrastructure(builder.Configuration);
builder.Services.AddIdentityAuthentication(builder.Configuration);
builder.Services.AddAuthorizationResultHandler<AuditingAuthorizationMiddlewareResultHandler>();
builder.Services.AddAuthRateLimiting(builder.Configuration);
builder.Services.AddValidation();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.ConfigureHttpJsonOptions(options => options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var app = builder.Build();

app.InitializeDatabase();

if (app.Environment.IsDevelopment())
{
	app.MapOpenApi();
}

app.UseForwardedHeaders();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseSerilogRequestLogging();

app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseExceptionHandler();

// Scoped to API endpoints so static files and the SPA fallback don't open a
// database transaction; /api/health is excluded so health checks stay
// independent of database availability. Registered after UseExceptionHandler
// (so the rollback happens before the exception is translated into a response)
// and before RateLimitingMiddleware, whose token-to-account lookups already
// need the active unit of work.
app.UseWhen(
	context => context.Request.Path.StartsWithSegments("/api")
		&& !context.Request.Path.StartsWithSegments("/api/health"),
	branch => branch.UseMiddleware<UnitOfWorkMiddleware>());

app.UseMiddleware<RateLimitingMiddleware>();
app.UseRateLimiter();

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthRoutes();
app.MapAuthRoutes();
app.MapAdminRoutes();

// Return 404 for unmatched /api/* routes so typos don't silently return the SPA
app.MapFallback("/api/{**path}", () => Results.NotFound());

// SPA fallback: serve index.html for all other unmatched routes
app.MapFallbackToFile("index.html");

app.Run();

public partial class Program { }