namespace PanoramaMusic.Students.Application.Commands.Guardians;

public sealed record UnlinkGuardianCommand(Guid StudentId, Guid GuardianId);