using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using System.Diagnostics.CodeAnalysis;

namespace PanoramaMusic.Reporting.Domain.Services;

/// <summary>
/// Turns a population plus the records of every selected non-Student
/// collection into the finished <see cref="ReportLayout"/>. The Student field
/// registry currently declares no non-Student collection, so
/// <paramref name="collections"/> is always empty and every section holds
/// exactly one row — the population member's own selected-column cells,
/// formatted through each column's registry-declared <c>IColumnFormat</c>.
/// The parameter stays part of the signature so a collection reader can be
/// registered without changing this method's contract.
/// </summary>
public sealed class ReportLayoutBuilder
{
	[SuppressMessage(
		"Style",
		"IDE0060:Remove unused parameter",
		Justification = "Part of the shipped public contract — always empty until a non-Student collection reader is registered.")]
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