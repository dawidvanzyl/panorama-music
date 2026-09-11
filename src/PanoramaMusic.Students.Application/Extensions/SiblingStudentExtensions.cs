using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.ValueObjects;

namespace PanoramaMusic.Students.Application.Extensions;

public static class SiblingStudentExtensions
{
	public static SiblingStudentResult ToResult(this SiblingStudent siblingStudent) =>
		new(
			siblingStudent.Student.StudentId,
			siblingStudent.Student.FirstName,
			siblingStudent.Student.LastName,
			siblingStudent.Student.DateOfBirth,
			siblingStudent.Student.Grade,
			siblingStudent.Student.Class,
			siblingStudent.Student.Phase,
			siblingStudent.Student.Language,
			siblingStudent.Population);
}