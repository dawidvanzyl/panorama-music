using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events;

public sealed record SiblingRemoved(Student Student, Student Sibling) : IDomainEvent;