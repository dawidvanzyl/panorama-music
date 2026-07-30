namespace PanoramaMusic.Students.Application.Commands.Siblings;

public sealed record AddSiblingCommand(Guid StudentId, Guid SiblingId);