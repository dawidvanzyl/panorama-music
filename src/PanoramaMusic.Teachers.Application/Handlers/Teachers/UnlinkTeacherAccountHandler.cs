using PanoramaMusic.Teachers.Application.Commands.Teachers;
using PanoramaMusic.Teachers.Application.Extensions;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Application.Handlers.Teachers;

public sealed class UnlinkTeacherAccountHandler(ITeacherRepository teacherRepository)
{
	/// <summary>
	/// Unlinks on behalf of teacher management, which only an Admin or Coordinator
	/// reaches. Unlinking your own account is legitimate here, for the same reason
	/// linking it is — the bar on maintaining your own link belongs to the
	/// self-service surface.
	/// </summary>
	public async Task<TeacherResult> HandleAsync(UnlinkTeacherAccountCommand command, CancellationToken cancellationToken)
	{
		var teacher = await teacherRepository.GetByIdAsync(command.TeacherId, cancellationToken)
			?? throw new EntityNotFoundException($"Teacher {command.TeacherId} was not found.");

		teacher.UnlinkAccount();

		await teacherRepository.UnlinkAccountAsync(teacher, cancellationToken);

		return teacher.ToResult();
	}
}