using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.ExtraCurriculars;

public sealed record ExtraCurricularCreated(ExtraCurricular ExtraCurricular) : IDomainEvent;