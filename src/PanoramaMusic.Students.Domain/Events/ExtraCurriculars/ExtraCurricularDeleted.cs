using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.ExtraCurriculars;

/// <summary>
/// An activity was removed from the catalogue, taking its practice times with
/// it. Carries the activity itself so the record can name the slots that went
/// with it — nothing can read them back afterwards.
/// </summary>
public sealed record ExtraCurricularDeleted(ExtraCurricular ExtraCurricular) : IDomainEvent;