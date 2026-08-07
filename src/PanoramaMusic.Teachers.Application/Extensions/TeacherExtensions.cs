using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Entities;

namespace PanoramaMusic.Teachers.Application.Extensions;

public static class TeacherExtensions
{
	public static TeacherResult ToResult(this Teacher teacher) =>
		new(
			teacher.TeacherId,
			teacher.FirstName,
			teacher.Surname,
			teacher.IsPrivate,
			teacher.IsActive,
			teacher.LinkedAccountId,
			teacher.LinkedAccountEmail);
}