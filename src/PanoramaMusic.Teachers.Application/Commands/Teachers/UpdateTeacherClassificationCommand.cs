using PanoramaMusic.Teachers.Application.Requests.Teachers;

namespace PanoramaMusic.Teachers.Application.Commands.Teachers;

public sealed record UpdateTeacherClassificationCommand(Guid TeacherId, UpdateTeacherClassificationRequest Request);