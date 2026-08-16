namespace PanoramaMusic.Students.Application.Requests.Courses;

/// <summary>
/// Cost is the whole of a course's mutable state, so the update carries a full
/// representation of it rather than a partial one. It is nullable for the same
/// reason the create request's members are — an omitted value must be
/// distinguishable from a valid zero and rejected by the validator.
/// </summary>
public sealed record UpdateCourseRequest(decimal? Cost);