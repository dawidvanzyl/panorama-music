namespace PanoramaMusic.Teachers.Infrastructure.Dtos;

/// <summary>
/// The masked persistence shape of a set of banking details. There is
/// deliberately no protected-account-number field: this DTO backs every read
/// but the reveal action, and a column that never lands in it cannot escape
/// through one.
/// </summary>
internal sealed record BankingDetailsDto(
	Guid Teacher_Id,
	string Bank,
	string Account_Type,
	string Branch_Code,
	string Account_Number_Last4);