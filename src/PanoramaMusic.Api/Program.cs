using PanoramaMusic.Api.Routes;
using PanoramaMusic.Infrastructure.Extensions;
using PanoramaMusic.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");
}

builder.Services.AddInfrastructure(connectionString);

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

if (resetDatabase)
{
    DatabaseSeeder.Run(connectionString);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Panorama Music API v1");
        options.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapHealthRoutes();

// SPA fallback: serve index.html for non-API routes
app.MapFallbackToFile("index.html");

app.Run();
