namespace PanoramaMusic.Reporting.Domain.Enums;

/// <summary>
/// The record collections a report can draw columns from. Student is the
/// only one currently registered; Guardian, Course and ExtraCurricular are
/// declared here so the run path's contract does not change when a reader
/// for one of them is registered.
/// </summary>
public enum ReportCollection
{
	Student,
	Guardian,
	Course,
	ExtraCurricular,
}