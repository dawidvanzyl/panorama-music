namespace PanoramaMusic.Reporting.Domain.Enums;

/// <summary>
/// The record collections a report can draw columns from. Student is the only
/// one #317 registers; #318 adds Guardian, Course and ExtraCurricular without
/// changing the run path.
/// </summary>
public enum ReportCollection
{
	Student,
	Guardian,
	Course,
	ExtraCurricular,
}
