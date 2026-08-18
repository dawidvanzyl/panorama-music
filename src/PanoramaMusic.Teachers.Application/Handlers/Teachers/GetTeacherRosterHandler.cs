using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Application.Handlers.Teachers;

/// <summary>
/// The roster as anyone assigning a teacher needs to see it. It does not go
/// through <c>TeacherResultComposer</c> — composing the full record would read
/// the linked account and the banking details this projection deliberately
/// leaves out.
/// </summary>
public sealed class GetTeacherRosterHandler(ITeacherRepository teacherRepository)
{
	public async Task<IList<TeacherRosterResult>> HandleAsync(CancellationToken cancellationToken)
	{
		var teachers = await teacherRepository.GetAllAsync(cancellationToken);

		return
		[
			.. teachers.Select(teacher => new TeacherRosterResult(
				teacher.TeacherId,
				teacher.FirstName,
				teacher.Surname,
				teacher.IsActive))
		];
	}
}