using Moq;
using PanoramaMusic.Reporting.Application.Handlers;
using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Application;

public class GetReportFieldsHandlerTests
{
	private readonly Mock<IDatasourceOptionReader> _datasourceOptionReaderMock = new();
	private readonly StudentFieldRegistry _registry = new();

	[Fact]
	[Trait("AC", "318UC14")]
	public async Task HandleAsync_ReadsEachDatasourceOnceAndPlacesOptionsOnItsFilter()
	{
		var teacherId = Guid.NewGuid();
		_datasourceOptionReaderMock
			.Setup(reader => reader.ReadAsync(ReportDatasource.GuardianRelationship, It.IsAny<CancellationToken>()))
			.ReturnsAsync([new FieldOption(Guid.NewGuid().ToString(), "Father")]);
		_datasourceOptionReaderMock
			.Setup(reader => reader.ReadAsync(ReportDatasource.Teacher, It.IsAny<CancellationToken>()))
			.ReturnsAsync([new FieldOption(teacherId.ToString(), "Amy Jacobs")]);
		_datasourceOptionReaderMock
			.Setup(reader => reader.ReadAsync(ReportDatasource.ExtraCurricular, It.IsAny<CancellationToken>()))
			.ReturnsAsync([new FieldOption(Guid.NewGuid().ToString(), "Choir (Junior)")]);

		var handler = new GetReportFieldsHandler(_registry, _datasourceOptionReaderMock.Object);

		var result = await handler.HandleAsync(TestContext.Current.CancellationToken);

		var teacherFilter = result.Filters.Single(f => f.Key == "course.teacher");

		ShouldlyHelpers.Satisfy(
			() => teacherFilter.Options.Single().Label.ShouldBe("Amy Jacobs"),
			() => result.Filters.Single(f => f.Key == "guardian.relationship").Options.Single().Label.ShouldBe("Father"),
			() => result.Filters.Single(f => f.Key == "extraCurricular.activity").Options.Single().Label.ShouldBe("Choir (Junior)"));

		_datasourceOptionReaderMock.Verify(reader => reader.ReadAsync(It.IsAny<ReportDatasource>(), It.IsAny<CancellationToken>()), Times.Exactly(3));
	}
}