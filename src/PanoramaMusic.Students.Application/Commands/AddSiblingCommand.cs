namespace PanoramaMusic.Students.Application.Commands;

public sealed record AddSiblingCommand(Guid StudentId, Guid SiblingId);