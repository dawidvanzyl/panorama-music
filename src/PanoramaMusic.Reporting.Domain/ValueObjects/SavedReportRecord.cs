using PanoramaMusic.Reporting.Domain.Entities;

namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>The creator's email is null when the creator's account no longer exists.</summary>
public sealed record SavedReportRecord(SavedReport Report, string? CreatorEmail);