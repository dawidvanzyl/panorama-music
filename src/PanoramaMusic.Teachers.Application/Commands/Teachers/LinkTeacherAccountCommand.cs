namespace PanoramaMusic.Teachers.Application.Commands.Teachers;

public sealed record LinkTeacherAccountCommand(Guid TeacherId, Guid AccountId);