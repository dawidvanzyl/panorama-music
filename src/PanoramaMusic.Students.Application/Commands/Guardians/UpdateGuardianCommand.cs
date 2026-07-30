using PanoramaMusic.Students.Application.Requests.Guardians;

namespace PanoramaMusic.Students.Application.Commands.Guardians;

public sealed record UpdateGuardianCommand(Guid GuardianId, UpdateGuardianRequest Request);