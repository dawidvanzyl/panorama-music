using PanoramaMusic.Domain;
using PanoramaMusic.Teachers.Domain.Entities;

namespace PanoramaMusic.Teachers.Domain.Events.Teachers;

public sealed record TeacherClassificationChanged(Teacher Before, Teacher After) : IDomainEvent;