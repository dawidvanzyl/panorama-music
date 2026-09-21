using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.Services;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Application.Services;

/// <summary>
/// Orchestrates one run: the population query, then exactly one query per
/// selected non-Student collection over every population id — never one query
/// per student. #317 selects only the Student collection, so the collection
/// loop never runs; #318 exercises it once Guardian/Course/ExtraCurricular
/// readers are registered.
/// </summary>
public sealed class ReportRunner(
	IPopulationReader populationReader,
	IEnumerable<ICollectionReader> collectionReaders,
	ReportLayoutBuilder layoutBuilder)
{
	public async Task<ReportLayout> RunAsync(ReportDefinition definition, CancellationToken cancellationToken)
	{
		var population = await populationReader.ReadAsync(definition, cancellationToken);

		var collections = new Dictionary<ReportCollection, IReadOnlyList<CollectionRecord>>();
		if (population.Count > 0)
		{
			var studentIds = population.Select(member => member.StudentId).ToList();
			foreach (var collection in definition.SelectedCollections.Where(collection => collection != ReportCollection.Student))
			{
				var reader = collectionReaders.FirstOrDefault(candidate => candidate.Collection == collection)
					?? throw new InvalidOperationException($"No collection reader is registered for {collection}.");

				var columns = definition.Columns.Where(column => column.Collection == collection).ToList();
				collections[collection] = await reader.ReadAsync(studentIds, columns, cancellationToken);
			}
		}

		return layoutBuilder.Build(definition, population, collections);
	}
}
