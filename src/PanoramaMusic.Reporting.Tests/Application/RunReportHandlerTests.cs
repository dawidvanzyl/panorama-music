using Moq;
using PanoramaMusic.Reporting.Application.Handlers;
using PanoramaMusic.Reporting.Application.Requests;
using PanoramaMusic.Reporting.Application.Services;
using PanoramaMusic.Reporting.Domain.Exceptions;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.Services;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Application;

public class RunReportHandlerTests
{
	private readonly Mock<IPopulationReader> _populationReaderMock = new();
	private readonly StudentFieldRegistry _registry = new();

	private RunReportHandler CreateHandler()
	{
		var runner = new ReportRunner(_populationReaderMock.Object, [], new ReportLayoutBuilder());
		return new RunReportHandler(_registry, runner, TimeProvider.System);
	}

	[Fact]
	[Trait("AC", "317UC1")]
	public async Task HandleAsync_UnknownFilterField_ThrowsAndNeverReadsThePopulation()
	{
		var handler = CreateHandler();
		var request = new RunReportRequest(
			[new ReportFilterRequest("student.unknown", "equals", ["x"])],
			["student.name"]);

		await Should.ThrowAsync<InvalidReportDefinitionException>(() => handler.HandleAsync(request, TestContext.Current.CancellationToken));

		_populationReaderMock.Verify(
			reader => reader.ReadAsync(It.IsAny<ReportDefinition>(), It.IsAny<CancellationToken>()),
			Times.Never);
	}

	[Fact]
	public async Task HandleAsync_ValidDefinition_MapsTheRunResult()
	{
		var studentId = Guid.NewGuid();
		_populationReaderMock
			.Setup(reader => reader.ReadAsync(It.IsAny<ReportDefinition>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync([new PopulationMember(studentId, new SourceValues(new Dictionary<string, object?>
			{
				["firstName"] = "Amy",
				["lastName"] = "van Zyl",
			}))]);

		var handler = CreateHandler();
		var request = new RunReportRequest([], ["student.name"]);

		var result = await handler.HandleAsync(request, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.StudentCount.ShouldBe(1),
			() => result.Columns.Single().Key.ShouldBe("student.name"),
			() => result.Sections.Single().StudentId.ShouldBe(studentId),
			() => result.Sections.Single().Rows.Single().Single().ShouldBe("Amy van Zyl"));
	}
}