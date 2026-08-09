using PanoramaMusic.Teachers.Application.Commands.Teachers;
using PanoramaMusic.Teachers.Application.Handlers.Teachers;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Application.Requests.Teachers;
using PanoramaMusic.Teachers.Application.Services;

namespace PanoramaMusic.Teachers.Application.Handlers.Self;

/// <summary>
/// A teacher correcting their own name. The self-service handlers resolve the
/// caller and then delegate to the handler an Admin's request already goes
/// through, rather than repeating what it does: a teacher acting on their own
/// record must be governed by exactly the same rules and raise exactly the same
/// domain events, and a second implementation is a second set of rules waiting
/// to drift.
/// <para>
/// The request carries name fields only. There is no self-service path to the
/// employment classification or the account link at all — those stay with an
/// Admin or Coordinator, and are not decisions a teacher makes about themselves.
/// </para>
/// </summary>
public sealed class UpdateOwnTeacherProfileHandler(
	OwnTeacherResolver ownTeacherResolver,
	UpdateTeacherProfileHandler updateTeacherProfileHandler)
{
	public async Task<TeacherResult> HandleAsync(UpdateTeacherProfileRequest request, CancellationToken cancellationToken)
	{
		var teacher = await ownTeacherResolver.ResolveAsync(cancellationToken);

		return await updateTeacherProfileHandler.HandleAsync(
			new UpdateTeacherProfileCommand(teacher.TeacherId, request),
			cancellationToken);
	}
}