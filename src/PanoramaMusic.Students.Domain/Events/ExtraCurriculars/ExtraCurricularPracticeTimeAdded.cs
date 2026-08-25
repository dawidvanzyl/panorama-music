using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.ExtraCurriculars;

/// <summary>
/// A weekly slot was added to an activity that already existed. Carries the
/// activity as well as the slot, so a consumer can name both without a further
/// read.
/// </summary>
public sealed record ExtraCurricularPracticeTimeAdded(
	ExtraCurricular ExtraCurricular,
	ExtraCurricularPracticeTime PracticeTime) : IDomainEvent;
