using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Domain.Events.Guardians;

public sealed record GuardianUpdated(Guardian Before, Guardian After, StudentWriteSource Source) : IDomainEvent;