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
	private readonly Mock<ISiblingGroupReader> _siblingGroupReaderMock = new();
	private readonly StudentFieldRegistry _registry = new();

	public RunSavedReportHandlerTests()
	{
		_siblingGroupReaderMock
			.Setup(reader => reader.ReadAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((IReadOnlyList<SiblingGroupMembership>)[]);
	}

	private RunSavedReportHandler CreateHandler()
	{
		var factory = new ReportDefinitionFactory(_registry, _datasourceOptionReaderMock.Object);
		var runner = new ReportRunner(
			_populationReaderMock.Object, [], new ReportLayoutBuilder(), _siblingGroupReaderMock.Object, new SiblingBadgeResolver());
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

	[Fact]
	public async Task HandleAsync_TwoLinkedSiblingsInTheSavedPopulation_SectionsCarryTheResolvedBadges()
	{
		var elder = new PopulationMember(Guid.NewGuid(), new SourceValues(new Dictionary<string, object?> { ["firstName"] = "Ben", ["lastName"] = "Z" }));
		var younger = new PopulationMember(Guid.NewGuid(), new SourceValues(new Dictionary<string, object?> { ["firstName"] = "Amy", ["lastName"] = "Z" }));
		var report = new SavedReport(
			Guid.NewGuid(),
			"Siblings",
			new StoredReportDefinition([], ["student.name"]),
			Guid.NewGuid(),
			DateTime.UtcNow,
			lastRunAt: null);
		_repositoryMock
			.Setup(repo => repo.GetByIdAsync(report.SavedReportId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new SavedReportRecord(report, "teacher@test.com"));
		_populationReaderMock
			.Setup(reader => reader.ReadAsync(It.IsAny<ReportDefinition>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync([elder, younger]);
		var groupKey = Guid.NewGuid();
		_siblingGroupReaderMock
			.Setup(reader => reader.ReadAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((IReadOnlyList<SiblingGroupMembership>)
			[
				new(elder.StudentId, groupKey, new DateOnly(2013, 1, 1)),
				new(younger.StudentId, groupKey, new DateOnly(2016, 1, 1)),
			]);

		var handler = CreateHandler();

		var result = await handler.HandleAsync(report.SavedReportId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Sections.Single(s => s.StudentId == elder.StudentId).SiblingBadge.ShouldBe("1.1"),
			() => result.Sections.Single(s => s.StudentId == younger.StudentId).SiblingBadge.ShouldBe("1.2"));
	}
}