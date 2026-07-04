using Microsoft.AspNetCore.HttpOverrides;
using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Api.Middleware;
using PanoramaMusic.Api.Routes;
using PanoramaMusic.Api.Routes.Identity;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using PanoramaMusic.Persistence.Extensions;
using System.Text.Json.Serialization;

AppContext.SetSwitch("Npgsql.EnableStoredProcedureCompatMode", true);

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

builder.Services.AddInfrastructure(connectionString);
builder.Services.AddIdentityInfrastructure(connectionString, builder.Configuration);
builder.Services.AddIdentityAuthentication(builder.Configuration);
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

app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<RateLimitingMiddleware>();
app.UseRateLimiter();

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseExceptionHandler();

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