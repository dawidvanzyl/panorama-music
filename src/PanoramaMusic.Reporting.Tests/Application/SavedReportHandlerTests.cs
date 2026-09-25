using Moq;
using PanoramaMusic.Reporting.Application.Handlers;
using PanoramaMusic.Reporting.Application.Interfaces;
using PanoramaMusic.Reporting.Application.Services;
using PanoramaMusic.Reporting.Domain.Exceptions;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.Services;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Application;

public class SavedReportHandlerTests
{
	private readonly Mock<ISavedReportRepository> _repositoryMock = new();
	private readonly Mock<IUserContext> _userContextMock = new();
	private readonly Mock<IPopulationReader> _populationReaderMock = new();
	private readonly Mock<IDatasourceOptionReader> _datasourceOptionReaderMock = new();
	private readonly StudentFieldRegistry _registry = new();

	public SavedReportHandlerTests()
	{
		_repositoryMock
			.Setup(repo => repo.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((SavedReportRecord?)null);
	}

	[Fact]
	[Trait("AC", "321UC6")]
	public async Task GetSavedReportHandler_UnknownId_ThrowsEntityNotFoundException()
	{
		var handler = new GetSavedReportHandler(_repositoryMock.Object, _userContextMock.Object);

		await Should.ThrowAsync<EntityNotFoundException>(() => handler.HandleAsync(Guid.NewGuid(), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "321UC6")]
	public async Task RunSavedReportHandler_UnknownId_ThrowsEntityNotFoundException()
	{
		var factory = new ReportDefinitionFactory(_registry, _datasourceOptionReaderMock.Object);
		var runner = new ReportRunner(_populationReaderMock.Object, [], new ReportLayoutBuilder());
		var handler = new RunSavedReportHandler(factory, _repositoryMock.Object, runner, _userContextMock.Object, TimeProvider.System);

		await Should.ThrowAsync<EntityNotFoundException>(() => handler.HandleAsync(Guid.NewGuid(), TestContext.Current.CancellationToken));
	}
}