using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Services;

/// <summary>
/// Turns a population plus the records of every selected non-Student
/// collection into the finished <see cref="ReportLayout"/>. #317 selects only
/// the Student collection, so <paramref name="collections"/> is always empty
/// and every section holds exactly one row — the population member's own
/// selected-column cells, formatted through each column's registry-declared
/// <c>IColumnFormat</c>. #318 fills <paramref name="collections"/> and adds
/// the positional zip and suppression this signature already anticipates.
/// </summary>
public sealed class ReportLayoutBuilder
{
	public ReportLayout Build(
		ReportDefinition definition,
		IReadOnlyList<PopulationMember> population,
		IReadOnlyDictionary<ReportCollection, IReadOnlyList<CollectionRecord>> collections)
	{
		var sections = new List<ReportLayoutSection>(population.Count);
		foreach (var member in population)
		{
			var row = definition.Columns.Select(column => column.Format.Format(member.Sources)).ToList();
			sections.Add(new ReportLayoutSection(member.StudentId, [row]));
		}

		return new ReportLayout(definition.Columns, sections);
	}
}
