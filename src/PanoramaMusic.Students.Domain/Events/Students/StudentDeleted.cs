using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Domain.Events.Students;

public sealed record StudentDeleted(Student Student, StudentWriteSource Source) : IDomainEvent;