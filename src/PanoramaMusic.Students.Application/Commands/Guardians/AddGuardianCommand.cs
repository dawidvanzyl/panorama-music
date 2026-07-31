using PanoramaMusic.Students.Application.Requests.Guardians;

namespace PanoramaMusic.Students.Application.Commands.Guardians;

public sealed record AddGuardianCommand(Guid StudentId, AddGuardianRequest Request);