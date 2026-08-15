using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.Courses;

public sealed record CourseCreated(Course Course) : IDomainEvent;
