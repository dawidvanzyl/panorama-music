namespace PanoramaMusic.Api.Tests.Models;

public sealed record TestAuditRow(string Outcome, string? Reason, string? ActorEmail, string Detail);