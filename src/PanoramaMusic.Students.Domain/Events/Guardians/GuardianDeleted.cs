using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Domain.Events.Guardians;

public sealed record GuardianDeleted(Guardian Guardian, StudentWriteSource Source) : IDomainEvent;