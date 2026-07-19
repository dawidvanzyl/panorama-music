using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Application.Extensions;

public static class StudentExtensions
{
	public static StudentResult ToResult(this Student student) =>
		new(
			student.StudentId,
			student.FirstName,
			student.LastName,
			student.DateOfBirth,
			student.Grade,
			student.Class,
			student.Phase,
			student.Language);
}