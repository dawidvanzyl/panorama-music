namespace PanoramaMusic.Students.Application.Interfaces;

public interface IUserContext
{
	/// <summary>The authenticated user's id, or null when the request is unauthenticated.</summary>
	Guid? UserId { get; }

	/// <summary>The authenticated user's email, or null when the request is unauthenticated.</summary>
	string? Email { get; }
}