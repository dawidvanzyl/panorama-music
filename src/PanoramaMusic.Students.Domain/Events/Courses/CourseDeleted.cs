using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.Courses;

public sealed record CourseDeleted(Course Course) : IDomainEvent;