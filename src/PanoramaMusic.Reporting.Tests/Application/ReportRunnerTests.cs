using Moq;
using PanoramaMusic.Reporting.Application.Services;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.Services;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Application;

/// <summary>
/// Untagged: no single UC names this behaviour directly, but it is the N+1
/// guarantee the plan calls out explicitly for <c>ReportRunner</c>.
/// </summary>
public class ReportRunnerTests
{
	private readonly Mock<IPopulationReader> _populationReaderMock = new();
	private readonly StudentFieldRegistry _registry = new();

	[Fact]
	public async Task RunAsync_EmptyPopulation_NeverCallsAnyCollectionReader()
	{
		_populationReaderMock
			.Setup(reader => reader.ReadAsync(It.IsAny<ReportDefinition>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync([]);
		var collectionReaderMock = new Mock<ICollectionReader>();

		var definition = ReportDefinition.Create([], ["student.name"], _registry);
		var runner = new ReportRunner(_populationReaderMock.Object, [collectionReaderMock.Object], new ReportLayoutBuilder());

		var layout = await runner.RunAsync(definition, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => layout.Sections.ShouldBeEmpty(),
			() => collectionReaderMock.Verify(
				reader => reader.ReadAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<IReadOnlyList<ColumnAttribute>>(), It.IsAny<CancellationToken>()),
				Times.Never));
	}

	[Fact]
	public async Task RunAsync_StudentOnlySelection_NeverCallsAnyCollectionReader()
	{
		_populationReaderMock
			.Setup(reader => reader.ReadAsync(It.IsAny<ReportDefinition>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync([new PopulationMember(Guid.NewGuid(), SourceValues.Empty)]);
		var collectionReaderMock = new Mock<ICollectionReader>();

		var definition = ReportDefinition.Create([], ["student.name"], _registry);
		var runner = new ReportRunner(_populationReaderMock.Object, [collectionReaderMock.Object], new ReportLayoutBuilder());

		await runner.RunAsync(definition, TestContext.Current.CancellationToken);

		collectionReaderMock.Verify(
			reader => reader.ReadAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<IReadOnlyList<ColumnAttribute>>(), It.IsAny<CancellationToken>()),
			Times.Never);
	}
}
