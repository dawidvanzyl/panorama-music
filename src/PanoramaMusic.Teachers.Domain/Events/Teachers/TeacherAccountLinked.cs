using PanoramaMusic.Domain;
using PanoramaMusic.Teachers.Domain.Entities;

namespace PanoramaMusic.Teachers.Domain.Events.Teachers;

public sealed record TeacherAccountLinked(Teacher Teacher, Guid AccountId, string AccountEmail) : IDomainEvent;