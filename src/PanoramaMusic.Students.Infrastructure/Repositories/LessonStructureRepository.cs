using Dapper;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Infrastructure.Dtos;
using PanoramaMusic.Students.Infrastructure.Extensions;
using PanoramaMusic.Students.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Students.Infrastructure.Repositories;

public class LessonStructureRepository(IUnitOfWork unitOfWork)
	: RepositoryBase(unitOfWork), ILessonStructureRepository
{
	public async Task<IList<LessonStructure>> GetAllAsync(CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition("students.get_lesson_structures", null, Transaction, cancellationToken);
		var dtos = await Connection.QueryAsync<LessonStructureDto>(command);

		return [.. dtos.Select(dto => dto.MapToLessonStructure())];
	}
}