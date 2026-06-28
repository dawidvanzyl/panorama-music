using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Api.Middleware;
using PanoramaMusic.Api.Routes;
using PanoramaMusic.Api.Routes.Identity;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using PanoramaMusic.Infrastructure.Extensions;
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

builder.Services.AddInfrastructure(connectionString);
builder.Services.AddIdentityInfrastructure(connectionString, builder.Configuration);
builder.Services.AddIdentityAuthentication(builder.Configuration);
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

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseExceptionHandler();

app.UseMiddleware<SecurityHeadersMiddleware>();

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