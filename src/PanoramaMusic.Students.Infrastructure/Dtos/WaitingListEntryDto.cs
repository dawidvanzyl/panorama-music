namespace PanoramaMusic.Students.Infrastructure.Dtos;

/// <summary>
/// One waiting-list entry joined to the student it belongs to and the lesson
/// structure they are waiting for.
/// </summary>
internal sealed record WaitingListEntryDto(
	Guid Waiting_List_Entry_Id,
	Guid Student_Id,
	string First_Name,
	string Last_Name,
	DateOnly Date_Of_Birth,
	string Grade,
	string? Class,
	string? Phase,
	string Language,
	Guid Lesson_Structure_Id,
	string Lesson_Type,
	string Duration_Type,
	string Occurrence_Type,
	string Instrument_Type,
	string? Notes,
	DateTime Added_At);
