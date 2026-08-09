using PanoramaMusic.Domain;
using PanoramaMusic.Teachers.Domain.Entities;

namespace PanoramaMusic.Teachers.Domain.Events.Teachers;

public sealed record TeacherProfileUpdated(Teacher Before, Teacher After) : IDomainEvent;