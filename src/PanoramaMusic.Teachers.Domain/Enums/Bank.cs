namespace PanoramaMusic.Teachers.Domain.Enums;

/// <summary>
/// The banks a teacher may be paid into. A closed set rather than free text:
/// the branch code is only meaningful against a known bank, and an open field
/// invites the typos that make a payment run fail.
/// </summary>
public enum Bank
{
	StandardBank,
	Fnb,
	Nedbank,
	Absa,
	Capitec,
}