using Moq;
using PanoramaMusic.Reporting.Application.Handlers;
using PanoramaMusic.Reporting.Application.Interfaces;
using PanoramaMusic.Reporting.Domain.Entities;
using PanoramaMusic.Reporting.Domain.Exceptions;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Application;

public class DeleteSavedReportHandlerTests
{
	private readonly Mock<ISavedReportRepository> _repositoryMock = new();
	private readonly Mock<IUserContext> _userContextMock = new();
	private readonly Guid _creatorId = Guid.NewGuid();

	public DeleteSavedReportHandlerTests()
	{
		_userContextMock.SetupGet(m => m.UserId).Returns(_creatorId);
	}

	private DeleteSavedReportHandler CreateHandler() => new(_repositoryMock.Object, _userContextMock.Object);

	private SavedReport CreateExistingReport(Guid createdBy) => new(
		Guid.NewGuid(),
		"Grade 4 Contacts",
		new StoredReportDefinition([], ["student.name"]),
		createdBy,
		DateTime.UtcNow,
		lastRunAt: null);

	[Fact]
	[Trait("AC", "322UC3")]
	public async Task HandleAsync_Creator_CallsDeleteAsync()
	{
		var report = CreateExistingReport(_creatorId);
		_repositoryMock
			.Setup(repo => repo.GetByIdAsync(report.SavedReportId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new SavedReportRecord(report, "teacher@test.com"));

		var handler = CreateHandler();

		await handler.HandleAsync(report.SavedReportId, TestContext.Current.CancellationToken);

		_repositoryMock.Verify(repo => repo.DeleteAsync(report, It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	[Trait("AC", "322UC4")]
	public async Task HandleAsync_NonCreator_ThrowsForbiddenExceptionAndNeverCallsDeleteAsync()
	{
		var report = CreateExistingReport(Guid.NewGuid());
		_repositoryMock
			.Setup(repo => repo.GetByIdAsync(report.SavedReportId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new SavedReportRecord(report, "other@test.com"));

		var handler = CreateHandler();

		await Should.ThrowAsync<ForbiddenException>(
			() => handler.HandleAsync(report.SavedReportId, TestContext.Current.CancellationToken));

		_repositoryMock.Verify(repo => repo.DeleteAsync(It.IsAny<SavedReport>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "322UC5")]
	public async Task HandleAsync_UnknownId_ThrowsEntityNotFoundExceptionAndNeverCallsDeleteAsync()
	{
		_repositoryMock
			.Setup(repo => repo.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((SavedReportRecord?)null);

		var handler = CreateHandler();

		await Should.ThrowAsync<EntityNotFoundException>(
			() => handler.HandleAsync(Guid.NewGuid(), TestContext.Current.CancellationToken));

		_repositoryMock.Verify(repo => repo.DeleteAsync(It.IsAny<SavedReport>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}
