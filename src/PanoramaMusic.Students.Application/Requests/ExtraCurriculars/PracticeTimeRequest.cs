using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Requests.ExtraCurriculars;

/// <summary>
/// One weekly slot on a create request. Both members are nullable so an omitted
/// value is distinguishable from a valid one and can be rejected by the
/// validator, rather than binding to Monday and midnight.
/// </summary>
public sealed record PracticeTimeRequest(DayType? Day, TimeOnly? StartTime);