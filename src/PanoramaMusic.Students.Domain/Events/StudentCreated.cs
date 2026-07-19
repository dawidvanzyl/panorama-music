using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events;

public sealed record StudentCreated(Student Student) : IDomainEvent;