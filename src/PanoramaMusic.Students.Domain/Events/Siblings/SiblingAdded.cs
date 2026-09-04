using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Domain.Events.Siblings;

public sealed record SiblingAdded(Student Student, Student Sibling, StudentWriteSource Source) : IDomainEvent;