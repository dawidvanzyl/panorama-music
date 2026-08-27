using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Tests.Factories;

public static class StudentFactory
{
	public static Student Create(
		Guid? studentId = null,
		string firstName = "Alice",
		string lastName = "Vance",
		DateOnly? dateOfBirth = null,
		GradeType grade = GradeType.Grade4,
		// Nullable so a test can build the Private-grade shape, which carries
		// neither: grade and phase are biconditional in the domain.
		ClassType? @class = ClassType.A1,
		PhaseType? phase = PhaseType.Junior,
		Language language = Language.English) =>
		Student.Create(
			studentId ?? Guid.NewGuid(),
			firstName,
			lastName,
			dateOfBirth ?? new DateOnly(2014, 5, 12),
			grade,
			@class,
			phase,
			language);
}