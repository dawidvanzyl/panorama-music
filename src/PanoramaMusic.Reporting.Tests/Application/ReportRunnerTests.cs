using Moq;
using PanoramaMusic.Reporting.Application.Services;
using PanoramaMusic.Reporting.Domain.Enums;
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
	private readonly Mock<ISiblingGroupReader> _siblingGroupReaderMock = new();
	private readonly SiblingBadgeResolver _siblingBadgeResolver = new();
	private readonly StudentFieldRegistry _registry = new();
	private static readonly IReadOnlyDictionary<ReportDatasource, IReadOnlyList<FieldOption>> _noDatasourceOptions =
		new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>>();

	public ReportRunnerTests()
	{
		_siblingGroupReaderMock
			.Setup(reader => reader.ReadAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((IReadOnlyList<SiblingGroupMembership>)[]);
	}

	[Fact]
	public async Task RunAsync_EmptyPopulation_NeverCallsAnyCollectionReader()
	{
		_populationReaderMock
			.Setup(reader => reader.ReadAsync(It.IsAny<ReportDefinition>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync([]);
		var collectionReaderMock = new Mock<ICollectionReader>();

		var definition = ReportDefinition.Create([], ["student.name"], _registry, _noDatasourceOptions);
		var runner = new ReportRunner(_populationReaderMock.Object, [collectionReaderMock.Object], new ReportLayoutBuilder(), _siblingGroupReaderMock.Object, _siblingBadgeResolver);

		var layout = await runner.RunAsync(definition, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => layout.Sections.ShouldBeEmpty(),
			() => collectionReaderMock.Verify(
				reader => reader.ReadAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<IReadOnlyList<ColumnAttribute>>(), It.IsAny<CancellationToken>()),
				Times.Never),
			() => _siblingGroupReaderMock.Verify(
				reader => reader.ReadAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<CancellationToken>()),
				Times.Never));
	}

	[Fact]
	public async Task RunAsync_StudentOnlySelection_NeverCallsAnyCollectionReader()
	{
		_populationReaderMock
			.Setup(reader => reader.ReadAsync(It.IsAny<ReportDefinition>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync([new PopulationMember(Guid.NewGuid(), SourceValues.Empty)]);
		var collectionReaderMock = new Mock<ICollectionReader>();

		var definition = ReportDefinition.Create([], ["student.name"], _registry, _noDatasourceOptions);
		var runner = new ReportRunner(_populationReaderMock.Object, [collectionReaderMock.Object], new ReportLayoutBuilder(), _siblingGroupReaderMock.Object, _siblingBadgeResolver);

		await runner.RunAsync(definition, TestContext.Current.CancellationToken);

		collectionReaderMock.Verify(
			reader => reader.ReadAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<IReadOnlyList<ColumnAttribute>>(), It.IsAny<CancellationToken>()),
			Times.Never);
	}

	[Fact]
	[Trait("AC", "318UC4")]
	public async Task RunAsync_ActivityFilterWithNoExtraCurricularColumn_NeverCallsTheExtraCurricularReaderAndGivesOneRowPerSection()
	{
		var activityId = Guid.NewGuid();
		var members = new[]
		{
			new PopulationMember(Guid.NewGuid(), new SourceValues(new Dictionary<string, object?> { ["firstName"] = "Jo", ["lastName"] = "Z" })),
			new PopulationMember(Guid.NewGuid(), new SourceValues(new Dictionary<string, object?> { ["firstName"] = "Kim", ["lastName"] = "Z" })),
		};
		_populationReaderMock
			.Setup(reader => reader.ReadAsync(It.IsAny<ReportDefinition>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(members);
		var extraCurricularReaderMock = new Mock<ICollectionReader>();
		extraCurricularReaderMock.SetupGet(reader => reader.Collection).Returns(ReportCollection.ExtraCurricular);

		var definition = ReportDefinition.Create(
			[new ReportFilterInput("extraCurricular.activity", "equals", [activityId.ToString()])],
			["student.name"],
			_registry,
			new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>>
			{
				[ReportDatasource.ExtraCurricular] = [new(activityId.ToString(), "Choir")],
			});
		var runner = new ReportRunner(_populationReaderMock.Object, [extraCurricularReaderMock.Object], new ReportLayoutBuilder(), _siblingGroupReaderMock.Object, _siblingBadgeResolver);

		var layout = await runner.RunAsync(definition, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => extraCurricularReaderMock.Verify(
				reader => reader.ReadAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<IReadOnlyList<ColumnAttribute>>(), It.IsAny<CancellationToken>()),
				Times.Never),
			() => layout.Sections.ShouldAllBe(section => section.Rows.Count == 1));
	}

	[Fact]
	[Trait("AC", "318UC7")]
	public async Task RunAsync_ThreeSelectedCollectionsAndManyMembers_EachReaderIsCalledOnceWithEveryPopulationId()
	{
		var members = Enumerable.Range(0, 50).Select(_ => new PopulationMember(Guid.NewGuid(), SourceValues.Empty)).ToList();
		_populationReaderMock
			.Setup(reader => reader.ReadAsync(It.IsAny<ReportDefinition>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(members);

		var guardianReaderMock = new Mock<ICollectionReader>();
		guardianReaderMock.SetupGet(reader => reader.Collection).Returns(ReportCollection.Guardian);
		guardianReaderMock
			.Setup(reader => reader.ReadAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<IReadOnlyList<ColumnAttribute>>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((IReadOnlyList<CollectionRecord>)[]);

		var courseReaderMock = new Mock<ICollectionReader>();
		courseReaderMock.SetupGet(reader => reader.Collection).Returns(ReportCollection.Course);
		courseReaderMock
			.Setup(reader => reader.ReadAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<IReadOnlyList<ColumnAttribute>>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((IReadOnlyList<CollectionRecord>)[]);

		var extraCurricularReaderMock = new Mock<ICollectionReader>();
		extraCurricularReaderMock.SetupGet(reader => reader.Collection).Returns(ReportCollection.ExtraCurricular);
		extraCurricularReaderMock
			.Setup(reader => reader.ReadAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<IReadOnlyList<ColumnAttribute>>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((IReadOnlyList<CollectionRecord>)[]);

		var definition = ReportDefinition.Create(
			[],
			["student.name", "guardian.name", "course.courseType", "extraCurricular.activity"],
			_registry,
			new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>>());
		var runner = new ReportRunner(
			_populationReaderMock.Object,
			[guardianReaderMock.Object, courseReaderMock.Object, extraCurricularReaderMock.Object],
			new ReportLayoutBuilder(),
			_siblingGroupReaderMock.Object,
			_siblingBadgeResolver);

		await runner.RunAsync(definition, TestContext.Current.CancellationToken);

		var expectedIds = members.Select(m => m.StudentId).ToList();
		guardianReaderMock.Verify(
			reader => reader.ReadAsync(
				It.Is<IReadOnlyCollection<Guid>>(ids => ids.Count == 50 && expectedIds.All(ids.Contains)),
				It.IsAny<IReadOnlyList<ColumnAttribute>>(),
				It.IsAny<CancellationToken>()),
			Times.Once);
		courseReaderMock.Verify(
			reader => reader.ReadAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<IReadOnlyList<ColumnAttribute>>(), It.IsAny<CancellationToken>()),
			Times.Once);
		extraCurricularReaderMock.Verify(
			reader => reader.ReadAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<IReadOnlyList<ColumnAttribute>>(), It.IsAny<CancellationToken>()),
			Times.Once);
	}

	[Fact]
	public async Task RunAsync_NonEmptyPopulation_ReadsSiblingGroupsExactlyOnceWithEveryPopulationId()
	{
		var members = Enumerable.Range(0, 3).Select(_ => new PopulationMember(Guid.NewGuid(), SourceValues.Empty)).ToList();
		_populationReaderMock
			.Setup(reader => reader.ReadAsync(It.IsAny<ReportDefinition>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(members);

		var definition = ReportDefinition.Create([], ["student.name"], _registry, _noDatasourceOptions);
		var runner = new ReportRunner(_populationReaderMock.Object, [], new ReportLayoutBuilder(), _siblingGroupReaderMock.Object, _siblingBadgeResolver);

		await runner.RunAsync(definition, TestContext.Current.CancellationToken);

		var expectedIds = members.Select(m => m.StudentId).ToList();
		_siblingGroupReaderMock.Verify(
			reader => reader.ReadAsync(
				It.Is<IReadOnlyCollection<Guid>>(ids => ids.Count == 3 && expectedIds.All(ids.Contains)),
				It.IsAny<CancellationToken>()),
			Times.Once);
	}

	[Fact]
	public async Task RunAsync_TwoLinkedSiblingsBothPresent_ResolvedBadgesLandOnTheMatchingSections()
	{
		var elder = new PopulationMember(Guid.NewGuid(), new SourceValues(new Dictionary<string, object?> { ["firstName"] = "Ben", ["lastName"] = "Z" }));
		var younger = new PopulationMember(Guid.NewGuid(), new SourceValues(new Dictionary<string, object?> { ["firstName"] = "Amy", ["lastName"] = "Z" }));
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

		var definition = ReportDefinition.Create([], ["student.name"], _registry, _noDatasourceOptions);
		var runner = new ReportRunner(_populationReaderMock.Object, [], new ReportLayoutBuilder(), _siblingGroupReaderMock.Object, _siblingBadgeResolver);

		var layout = await runner.RunAsync(definition, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => layout.Sections.Single(s => s.StudentId == elder.StudentId).SiblingBadge!.Label.ShouldBe("1.1"),
			() => layout.Sections.Single(s => s.StudentId == younger.StudentId).SiblingBadge!.Label.ShouldBe("1.2"));
	}
}