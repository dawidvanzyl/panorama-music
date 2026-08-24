using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Requests.ExtraCurriculars;

/// <summary>
/// An activity and the whole of its weekly practice times, defined in one
/// request — the slots are owned by the activity, so there is no moment at which
/// one exists without the other. Every member is nullable so an omitted value is
/// rejected by the validator rather than binding to an enum's first member.
/// </summary>
public sealed record CreateExtraCurricularRequest(
	string? Description,
	PhaseType? Phase,
	IList<PracticeTimeRequest>? PracticeTimes);
