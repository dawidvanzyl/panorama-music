namespace PanoramaMusic.Students.Application.Interfaces;

public interface IUserContext
{
	/// <summary>The authenticated user's id, or null when the request is unauthenticated.</summary>
	Guid? UserId { get; }

	/// <summary>The authenticated user's email, or null when the request is unauthenticated.</summary>
	string? Email { get; }

	/// <summary>
	/// Whether the caller holds the Teacher role. Endpoint policies answer who
	/// may call what; this answers a question a policy cannot, because it
	/// depends on the record being written rather than the route.
	/// </summary>
	bool IsTeacher { get; }
}