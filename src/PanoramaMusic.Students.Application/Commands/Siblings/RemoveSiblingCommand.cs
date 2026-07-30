namespace PanoramaMusic.Students.Application.Commands.Siblings;

public sealed record RemoveSiblingCommand(Guid StudentId, Guid SiblingId);