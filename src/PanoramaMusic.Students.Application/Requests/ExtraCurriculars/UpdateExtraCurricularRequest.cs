using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Requests.ExtraCurriculars;

/// <summary>
/// The whole of an activity's editable state — its description and the phase it
/// is offered to. Practice times are absent by design: they are added and
/// removed on their own surface and a slot is never edited in place. Both
/// members are nullable so an omitted value is rejected by the validator rather
/// than binding to an enum's first member.
/// </summary>
public sealed record UpdateExtraCurricularRequest(string? Description, PhaseType? Phase);
