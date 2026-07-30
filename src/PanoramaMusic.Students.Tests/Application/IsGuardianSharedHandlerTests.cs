using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Handlers.Guardians;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class IsGuardianSharedHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly IsGuardianSharedHandler _handler;

	public IsGuardianSharedHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<IsGuardianSharedHandler>();
	}

	[Fact]
	public async Task HandleAsync_GuardianLinkedToOnlyOneStudent_ReturnsFalse()
	{
		var guardian = GuardianFactory.Create();

		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetLinkCountAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(1);

		var result = await _handler.HandleAsync(guardian.GuardianId, TestContext.Current.CancellationToken);

		result.ShouldBeFalse();
	}

	[Fact]
	public async Task HandleAsync_GuardianLinkedToMultipleStudents_ReturnsTrue()
	{
		var guardian = GuardianFactory.Create();

		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetLinkCountAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(2);

		var result = await _handler.HandleAsync(guardian.GuardianId, TestContext.Current.CancellationToken);

		result.ShouldBeTrue();
	}

	[Fact]
	public async Task HandleAsync_UnknownGuardianId_ThrowsEntityNotFoundException()
	{
		var guardianId = Guid.NewGuid();

		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((Guardian?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(guardianId, TestContext.Current.CancellationToken));
	}
}