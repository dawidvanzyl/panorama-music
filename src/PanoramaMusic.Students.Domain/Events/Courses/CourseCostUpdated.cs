using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.Courses;

public sealed record CourseCostUpdated(Course Before, Course After) : IDomainEvent;