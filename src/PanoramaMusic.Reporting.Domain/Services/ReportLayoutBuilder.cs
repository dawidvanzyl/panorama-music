using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Services;

public sealed class ReportLayoutBuilder
{
	public ReportLayout Build(
		ReportDefinition definition,
		IReadOnlyList<PopulationMember> population,
		IReadOnlyDictionary<ReportCollection, IReadOnlyList<CollectionRecord>> collections)
	{
		var selectedNonStudentCollections = definition.SelectedCollections
			.Where(collection => collection != ReportCollection.Student)
			.ToList();

		var sortedByStudent = new Dictionary<ReportCollection, ILookup<Guid, CollectionRecord>>();
		foreach (var collection in selectedNonStudentCollections)
		{
			var records = collections.TryGetValue(collection, out var value) ? value : [];
			var sorted = CollectionRecordOrdering.Sort(collection, records);
			sortedByStudent[collection] = sorted.ToLookup(record => record.StudentId);
		}

		var sections = new List<ReportLayoutSection>(population.Count);
		foreach (var member in population)
		{
			var recordsByCollection = selectedNonStudentCollections.ToDictionary(
				collection => collection,
				collection => (IReadOnlyList<CollectionRecord>)[.. sortedByStudent[collection][member.StudentId]]);

			var rowCount = selectedNonStudentCollections.Count == 0
				? 1
				: Math.Max(1, recordsByCollection.Values.Select(records => records.Count).DefaultIfEmpty(0).Max());

			var rows = new List<IReadOnlyList<string>>(rowCount);
			for (var i = 0; i < rowCount; i++)
			{
				var row = new List<string>(definition.Columns.Count);
				foreach (var column in definition.Columns)
				{
					if (column.Collection == ReportCollection.Student)
					{
						row.Add(i == 0 ? column.Format.Format(member.Sources) : string.Empty);
						continue;
					}

					var records = recordsByCollection[column.Collection];
					row.Add(i < records.Count ? column.Format.Format(records[i].Sources) : string.Empty);
				}

				rows.Add(row);
			}

			sections.Add(new ReportLayoutSection(member.StudentId, rows));
		}

		return new ReportLayout(definition.Columns, sections);
	}
}