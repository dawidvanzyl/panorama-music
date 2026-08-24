namespace PanoramaMusic.Students.Infrastructure.Dtos;

/// <summary>
/// One row of the activity listing: an activity joined to one of the practice
/// times it owns. An activity always has at least one, so the join never drops a
/// row that should have been listed. The start time is a TimeOnly end to end —
/// the column is TIME and nothing between it and the wire carries a date.
/// </summary>
internal sealed record ExtraCurricularPracticeTimeDto(
	Guid Extra_Curricular_Id,
	string Description,
	string Phase,
	Guid Practice_Time_Id,
	string Day,
	TimeOnly Start_Time);