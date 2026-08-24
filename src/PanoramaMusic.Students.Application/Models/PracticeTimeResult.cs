using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Models;

/// <summary>
/// One weekly slot of an activity. The start time is a time of day and carries
/// no date component, on the wire as in the database.
/// </summary>
public sealed record PracticeTimeResult(Guid PracticeTimeId, DayType Day, TimeOnly StartTime);