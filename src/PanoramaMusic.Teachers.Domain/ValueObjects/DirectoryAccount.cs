namespace PanoramaMusic.Teachers.Domain.ValueObjects;

/// <summary>
/// A login account as the Teachers context sees it. Identity owns the values;
/// this is the shape Teachers asks for through <see cref="Interfaces.IAccountDirectory"/>,
/// so the two contexts meet on a contract rather than on Identity's tables.
/// </summary>
public sealed record DirectoryAccount(Guid AccountId, string Email, bool HasTeacherRole);