using PanoramaMusic.Teachers.Application.Commands.Teachers;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Application.Services;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Interfaces;
using PanoramaMusic.Teachers.Domain.Services;

namespace PanoramaMusic.Teachers.Application.Handlers.Teachers;

public sealed class CreateTeacherHandler(
	ITeacherRepository teacherRepository,
	TeacherAccountLinkService accountLinkService,
	TeacherResultComposer resultComposer)
{
	public async Task<TeacherResult> HandleAsync(CreateTeacherCommand command, CancellationToken cancellationToken)
	{
		var request = command.Request;
		var teacher = Teacher.Create(
			Guid.NewGuid(),
			request.FirstName,
			request.Surname,
			request.IsPrivate);

		// Linking during creation runs the same eligibility rules as linking
		// afterwards, and raises the same link event, so the audit trail does not
		// depend on which route the link arrived by.
		if (request.LinkedAccountId is { } accountId)
			await accountLinkService.LinkAsync(teacher, accountId, cancellationToken);

		await teacherRepository.CreateAsync(teacher, cancellationToken);

		return await resultComposer.ComposeAsync(teacher, cancellationToken);
	}
}