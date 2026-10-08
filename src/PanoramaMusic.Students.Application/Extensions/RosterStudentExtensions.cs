using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.ValueObjects;

namespace PanoramaMusic.Students.Application.Extensions;

public static class RosterStudentExtensions
{
	public static RosterStudentResult ToResult(this RosterStudent rosterStudent) =>
		new(
			rosterStudent.Student.StudentId,
			rosterStudent.Student.FirstName,
			rosterStudent.Student.LastName,
			rosterStudent.Student.DateOfBirth,
			rosterStudent.Student.Grade,
			rosterStudent.Student.Class,
			rosterStudent.Student.Phase,
			rosterStudent.Student.Language,
			[.. rosterStudent.TeacherIds]);
}