using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.StudentExtraCurriculars;

/// <summary>
/// The activities offered to a phase, for a student who does not exist yet. The
/// create wizard stages its assignments before the student is saved, so it has no
/// identifier to ask the student-scoped read with — and it cannot fall back to the
/// catalogue endpoint, which this area's callers are not all admitted to.
/// <para>
/// There is nothing to exclude here: a student who does not exist takes part in
/// nothing. What the wizard has already staged is its own to leave out of the
/// picker.
/// </para>
/// </summary>
public sealed class GetAssignableExtraCurricularsByPhaseHandler(IExtraCurricularRepository extraCurricularRepository)
{
	public async Task<IList<ExtraCurricularResult>> HandleAsync(PhaseType phase, CancellationToken cancellationToken)
	{
		var activities = await extraCurricularRepository.GetAllAsync(phase, cancellationToken);

		return [.. activities.Select(extraCurricular => extraCurricular.ToResult())];
	}
}