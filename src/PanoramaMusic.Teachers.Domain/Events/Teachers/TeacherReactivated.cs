using PanoramaMusic.Domain;
using PanoramaMusic.Teachers.Domain.Entities;

namespace PanoramaMusic.Teachers.Domain.Events.Teachers;

public sealed record TeacherReactivated(Teacher Teacher) : IDomainEvent;