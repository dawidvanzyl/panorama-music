using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Models;

/// <summary>
/// An activity with the whole of its weekly practice times, in day-then-time
/// order. The enum members are the keys that cross the wire — the display text a
/// human reads is the consuming screen's concern.
/// </summary>
public sealed record ExtraCurricularResult(
	Guid ExtraCurricularId,
	string Description,
	PhaseType Phase,
	IList<PracticeTimeResult> PracticeTimes);
