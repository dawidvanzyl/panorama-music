using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Domain.ValueObjects;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Infrastructure.Directories;

/// <summary>
/// The Teachers context's answer to the Students context's
/// <see cref="ITeacherDirectory"/>.
/// <para>
/// The port is declared by Students, which needs the data; the implementation
/// lives here, because who teaches and what they are called are this context's
/// facts to publish. Students never learns what backs a
/// <see cref="DirectoryTeacher"/> — the same shape as this context's own
/// <c>IAccountDirectory</c>, which Identity implements.
/// </para>
/// </summary>
public sealed class StudentsTeacherDirectory(ITeacherRepository teacherRepository) : ITeacherDirectory
{
	public async Task<DirectoryTeacher?> GetTeacherAsync(Guid teacherId, CancellationToken cancellationToken)
	{
		var teacher = await teacherRepository.GetByIdAsync(teacherId, cancellationToken);

		return teacher is null ? null : new DirectoryTeacher(teacher.TeacherId, teacher.FirstName, teacher.Surname);
	}

	public async Task<IReadOnlyDictionary<Guid, DirectoryTeacher>> GetTeachersAsync(
		IReadOnlyCollection<Guid> teacherIds,
		CancellationToken cancellationToken)
	{
		if (teacherIds.Count == 0)
			return new Dictionary<Guid, DirectoryTeacher>();

		// One read for the ids actually asked about — neither a lookup per id, nor
		// a read of the whole roster narrowed afterwards, so the cost grows with
		// the request rather than with the table.
		var teachers = await teacherRepository.GetByIdsAsync(teacherIds, cancellationToken);

		return teachers
			.ToDictionary(
				teacher => teacher.TeacherId,
				teacher => new DirectoryTeacher(teacher.TeacherId, teacher.FirstName, teacher.Surname));
	}
}