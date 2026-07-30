using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.Guardians;

public sealed record GuardianUpdated(Guardian Before, Guardian After) : IDomainEvent;