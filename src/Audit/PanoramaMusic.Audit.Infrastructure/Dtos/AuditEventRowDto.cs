namespace PanoramaMusic.Audit.Infrastructure.Dtos;

internal sealed record AuditEventRowDto(
	Guid Id,
	DateTime Occurred_At,
	string Event_Type,
	Guid? Actor_Id,
	string? Actor_Email,
	Guid? Target_Id,
	string Source_Ip,
	string User_Agent,
	Guid Correlation_Id,
	string Outcome,
	string? Reason,
	string Detail,
	long Total_Count);