using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.ValueObjects;

namespace PanoramaMusic.Students.Application.Extensions;

public static class SiblingCandidateExtensions
{
	public static SiblingCandidateResult ToResult(this SiblingCandidate candidate) =>
		new(
			candidate.Student.StudentId,
			candidate.Student.FirstName,
			candidate.Student.LastName,
			candidate.Student.DateOfBirth,
			candidate.Student.Grade,
			candidate.Student.Class,
			candidate.Student.Phase,
			candidate.Student.Language,
			candidate.Population);
}
