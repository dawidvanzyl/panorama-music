using PanoramaMusic.Teachers.Application.Commands.Teachers;
using PanoramaMusic.Teachers.Application.Extensions;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;
using PanoramaMusic.Teachers.Domain.Services;

namespace PanoramaMusic.Teachers.Application.Handlers.Teachers;

public sealed class LinkTeacherAccountHandler(
	ITeacherRepository teacherRepository,
	TeacherAccountLinkService accountLinkService)
{
	/// <summary>
	/// Links on behalf of teacher management, which only an Admin or Coordinator
	/// reaches. Linking your own account is legitimate here — an Admin or
	/// Coordinator may also teach, and may be maintaining their own record. The
	/// bar on maintaining your own link belongs to the self-service surface, not
	/// to this one.
	/// </summary>
	public async Task<TeacherResult> HandleAsync(LinkTeacherAccountCommand command, CancellationToken cancellationToken)
	{
		var teacher = await teacherRepository.GetByIdAsync(command.TeacherId, cancellationToken)
			?? throw new EntityNotFoundException($"Teacher {command.TeacherId} was not found.");

		await accountLinkService.LinkAsync(teacher, command.AccountId, cancellationToken);

		await teacherRepository.LinkAccountAsync(teacher, cancellationToken);

		return teacher.ToResult();
	}
}