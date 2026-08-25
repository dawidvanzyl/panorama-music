namespace PanoramaMusic.Students.Application.Commands.ExtraCurriculars;

/// <summary>
/// Removes one weekly slot from the activity that owns it. Both identifiers are
/// carried: a slot is only ever removed through its own activity.
/// </summary>
public sealed record RemovePracticeTimeCommand(Guid ExtraCurricularId, Guid PracticeTimeId);
