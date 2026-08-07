using PanoramaMusic.Domain;
using PanoramaMusic.Teachers.Domain.Entities;

namespace PanoramaMusic.Teachers.Domain.Events.Teachers;

public sealed record TeacherAccountUnlinked(Teacher Teacher, Guid PreviousAccountId, string? PreviousAccountEmail) : IDomainEvent;