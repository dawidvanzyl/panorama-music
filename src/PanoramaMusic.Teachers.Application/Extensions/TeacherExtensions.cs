using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Entities;

namespace PanoramaMusic.Teachers.Application.Extensions;

public static class TeacherExtensions
{
	/// <summary>
	/// The linked account's email is passed in rather than read off the teacher:
	/// Identity owns it, so the handler resolves it through the account directory
	/// and composes it here.
	/// </summary>
	public static TeacherResult ToResult(this Teacher teacher, string? linkedAccountEmail = null) =>
		new(
			teacher.TeacherId,
			teacher.FirstName,
			teacher.Surname,
			teacher.IsPrivate,
			teacher.IsActive,
			teacher.LinkedAccountId,
			linkedAccountEmail);
}