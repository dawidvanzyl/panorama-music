using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.ExtraCurriculars;

/// <summary>
/// A weekly slot was removed from an activity. Carries the slot itself, since by
/// the time a consumer sees this the activity no longer holds it.
/// </summary>
public sealed record ExtraCurricularPracticeTimeRemoved(
	ExtraCurricular ExtraCurricular,
	ExtraCurricularPracticeTime PracticeTime) : IDomainEvent;