using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.Guardians;

public sealed record GuardianDeleted(Guardian Guardian) : IDomainEvent;