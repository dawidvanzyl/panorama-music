using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.ExtraCurriculars;

/// <summary>
/// An activity's description or phase was corrected. Carries the activity as it
/// stood beforehand as well as afterwards, so the audit record can say what the
/// value changed from — the same shape <see cref="Courses.CourseCostUpdated"/>
/// already uses.
/// </summary>
public sealed record ExtraCurricularUpdated(
	ExtraCurricular Before,
	ExtraCurricular After) : IDomainEvent;
