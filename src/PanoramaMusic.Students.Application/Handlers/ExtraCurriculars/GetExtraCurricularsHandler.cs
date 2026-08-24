using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.ExtraCurriculars;

public sealed class GetExtraCurricularsHandler(IExtraCurricularRepository extraCurricularRepository)
{
	/// <summary>
	/// Every activity with its practice times, or only those offered to the given
	/// phase. The screen narrows the list it already holds by description, phase
	/// and day; the phase here is for a caller that needs the read itself
	/// narrowed rather than the rendering.
	/// </summary>
	public async Task<IList<ExtraCurricularResult>> HandleAsync(PhaseType? phase, CancellationToken cancellationToken)
	{
		var extraCurriculars = await extraCurricularRepository.GetAllAsync(phase, cancellationToken);

		return [.. extraCurriculars.Select(extraCurricular => extraCurricular.ToResult())];
	}
}
