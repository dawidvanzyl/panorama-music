using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events;

public sealed record StudentUpdated(Student Before, Student After) : IDomainEvent;