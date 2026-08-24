using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Infrastructure.Dtos;

namespace PanoramaMusic.Students.Infrastructure.Extensions;

internal static class ExtraCurricularPracticeTimeDtoExtensions
{
	/// <summary>
	/// Folds the joined rows back into activities, each holding the slots that
	/// came with it. The aggregate puts its own slots into day-then-time order,
	/// so the grouping preserves whatever order the query returned without
	/// caring about it.
	/// </summary>
	internal static IList<ExtraCurricular> MapToExtraCurriculars(this IEnumerable<ExtraCurricularPracticeTimeDto> dtos) =>
		[.. dtos
			.GroupBy(dto => (dto.Extra_Curricular_Id, dto.Description, dto.Phase))
			.Select(group => new ExtraCurricular(
				group.Key.Extra_Curricular_Id,
				group.Key.Description,
				Enum.Parse<PhaseType>(group.Key.Phase),
				group.Select(dto => new ExtraCurricularPracticeTime(
					dto.Practice_Time_Id,
					dto.Extra_Curricular_Id,
					Enum.Parse<DayType>(dto.Day),
					dto.Start_Time))))];
}
