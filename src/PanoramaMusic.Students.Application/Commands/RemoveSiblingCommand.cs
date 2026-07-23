namespace PanoramaMusic.Students.Application.Commands;

public sealed record RemoveSiblingCommand(Guid StudentId, Guid SiblingId);