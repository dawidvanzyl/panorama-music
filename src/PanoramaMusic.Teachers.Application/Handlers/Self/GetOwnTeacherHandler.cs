using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Application.Services;

namespace PanoramaMusic.Teachers.Application.Handlers.Self;

/// <summary>
/// The caller's own record, composed exactly as an Admin's view of it is — the
/// same masked banking details, the same linked-account email. What differs is
/// only how the teacher was found: from the signed-in account, so there is no
/// identifier in the request that could point at somebody else.
/// </summary>
public sealed class GetOwnTeacherHandler(
	OwnTeacherResolver ownTeacherResolver,
	TeacherResultComposer resultComposer)
{
	public async Task<TeacherResult> HandleAsync(CancellationToken cancellationToken)
	{
		var teacher = await ownTeacherResolver.ResolveAsync(cancellationToken);

		return await resultComposer.ComposeAsync(teacher, cancellationToken);
	}
}