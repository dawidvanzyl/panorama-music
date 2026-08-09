using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Entities;

namespace PanoramaMusic.Teachers.Application.Extensions;

public static class TeacherExtensions
{
	/// <summary>
	/// The linked account's email and the banking details are passed in rather
	/// than read off the teacher: Identity owns the one and a separate aggregate
	/// owns the other, so the handler resolves both and composes them here.
	/// </summary>
	public static TeacherResult ToResult(
		this Teacher teacher,
		string? linkedAccountEmail = null,
		BankingDetailsResult? banking = null) =>
		new(
			teacher.TeacherId,
			teacher.FirstName,
			teacher.Surname,
			teacher.IsPrivate,
			teacher.IsActive,
			teacher.LinkedAccountId,
			linkedAccountEmail,
			banking);
}