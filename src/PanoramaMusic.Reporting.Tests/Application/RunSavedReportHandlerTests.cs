using Moq;
using PanoramaMusic.Reporting.Application.Handlers;
using PanoramaMusic.Reporting.Application.Interfaces;
using PanoramaMusic.Reporting.Application.Services;
using PanoramaMusic.Reporting.Domain.Entities;
using PanoramaMusic.Reporting.Domain.Exceptions;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.Services;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Application;

public class RunSavedReportHandlerTests
{
	private readonly Mock<ISavedReportRepository> _repositoryMock = new();
	private readonly Mock<IUserContext> _userContextMock = new();
	private readonly Mock<IPopulationReader> _populationReaderMock = new();
	private readonly Mock<IDatasourceOptionReader> _datasourceOptionReaderMock = new();
	private readonly StudentFieldRegistry _registry = new();

	private RunSavedReportHandler CreateHandler()
	{
		var factory = new ReportDefinitionFactory(_registry, _datasourceOptionReaderMock.Object);
		var runner = new ReportRunner(_populationReaderMock.Object, [], new ReportLayoutBuilder());
		return new RunSavedReportHandler(factory, _repositoryMock.Object, runner, _userContextMock.Object, TimeProvider.System);
	}

	[Fact]
	[Trait("AC", "321UC7")]
	public async Task HandleAsync_StoredDefinitionReferencesWithdrawnField_ThrowsNamingTheKey_AndNeverRunsOrRecordsARun()
	{
		var report = new SavedReport(
			Guid.NewGuid(),
			"Grade 4 Contacts",
			new StoredReportDefinition([new ReportFilterInput("student.withdrawn", "equals", ["x"])], ["student.name"]),
			Guid.NewGuid(),
			DateTime.UtcNow,
			lastRunAt: null);
		_repositoryMock
			.Setup(repo => repo.GetByIdAsync(report.SavedReportId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new SavedReportRecord(report, "teacher@test.com"));

		var handler = CreateHandler();

		var exception = await Should.ThrowAsync<InvalidReportDefinitionException>(
			() => handler.HandleAsync(report.SavedReportId, TestContext.Current.CancellationToken));
		exception.Message.ShouldContain("student.withdrawn");

		_populationReaderMock.Verify(reader => reader.ReadAsync(It.IsAny<ReportDefinition>(), It.IsAny<CancellationToken>()), Times.Never);
		_repositoryMock.Verify(repo => repo.UpdateLastRunAsync(It.IsAny<SavedReport>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}
