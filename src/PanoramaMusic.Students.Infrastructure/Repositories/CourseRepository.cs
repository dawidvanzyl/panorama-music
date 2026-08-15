using Dapper;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Infrastructure.Dtos;
using PanoramaMusic.Students.Infrastructure.Extensions;
using PanoramaMusic.Students.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Students.Infrastructure.Repositories;

public class CourseRepository(IUnitOfWork unitOfWork, IDomainEventCollector domainEventCollector)
	: RepositoryBase(unitOfWork), ICourseRepository
{
	public async Task<IList<Course>> GetAllAsync(CourseFilter filter, CancellationToken cancellationToken)
	{
		// The function joins the lesson structures itself, so the whole list
		// arrives resolved in this one round trip.
		var command = CreateCommandDefinition(
			"students.get_courses",
			new
			{
				p_course_type = filter.CourseType?.ToString(),
				p_lesson_type = filter.LessonType?.ToString(),
				p_duration_type = filter.DurationType?.ToString(),
				p_occurrence_type = filter.OccurrenceType?.ToString(),
			},
			Transaction,
			cancellationToken);
		var dtos = await Connection.QueryAsync<CourseDto>(command);

		return [.. dtos.Select(dto => dto.MapToCourse())];
	}

	public async Task CreateAsync(Course course, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.create_course",
			new
			{
				p_course_id = course.CourseId,
				p_course_type = course.CourseType.ToString(),
				p_cost = course.Cost,
				p_lesson_structure_id = course.LessonStructure.LessonStructureId,
			},
			Transaction,
			cancellationToken);

		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(course);
	}
}