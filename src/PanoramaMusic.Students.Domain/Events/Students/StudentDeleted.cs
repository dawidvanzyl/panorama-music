using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.Students;

public sealed record StudentDeleted(Student Student) : IDomainEvent;