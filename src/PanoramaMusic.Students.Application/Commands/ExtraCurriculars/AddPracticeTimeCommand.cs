using PanoramaMusic.Students.Application.Requests.ExtraCurriculars;

namespace PanoramaMusic.Students.Application.Commands.ExtraCurriculars;

/// <summary>
/// Adds one weekly slot to an activity that already exists. The activity is
/// addressed by the route rather than by the body, so it travels alongside the
/// request instead of inside it.
/// </summary>
public sealed record AddPracticeTimeCommand(Guid ExtraCurricularId, PracticeTimeRequest Request);