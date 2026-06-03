using System.Runtime.CompilerServices;

[assembly: InternalsVisibleTo("PanoramaMusic.Tests")]
namespace PanoramaMusic.Identity.Infrastructure.Entities;

internal sealed record InviteTokenRow(
	Guid Token_id,
	Guid User_id,
	string Token_hash,
	DateTime Expires_at,
	DateTime? Used_at);