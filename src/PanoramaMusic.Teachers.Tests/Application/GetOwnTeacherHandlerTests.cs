using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Teachers.Application.Handlers.Self;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Messages;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Teachers.Tests.Application;

public class GetOwnTeacherHandlerTests : IClassFixture<TeachersTestFixture>
{
	private readonly TeachersTestContext _context;
	private readonly GetOwnTeacherHandler _handler;

	public GetOwnTeacherHandlerTests(TeachersTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<GetOwnTeacherHandler>();
	}

	/// <summary>
	/// The signed-in account claims no teacher, so there is no record to hand
	/// back — and the handler must refuse rather than fall through to any other
	/// teacher's. The lookup that would have returned somebody else's record is
	/// asserted never to happen at all.
	/// </summary>
	[Fact]
	[Trait("AC", "235UC8")]
	public async Task HandleAsync_AccountLinkedToNoTeacher_ThrowsEntityNotFoundExceptionAndReadsNoOtherRecord()
	{
		var accountId = Guid.NewGuid();
		_context.Contexts.UserContextMock.SetupGet(u => u.UserId).Returns(accountId);
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.GetByLinkedAccountIdAsync(accountId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((Teacher?)null);

		var exception = await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => exception.Message.ShouldBe(TeacherSelfServiceMessages.NoLinkedTeacher),
			() => _context.Repositories.TeacherRepositoryMock.Verify(
				r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.TeacherRepositoryMock.Verify(
				r => r.GetAllAsync(It.IsAny<CancellationToken>()), Times.Never));
	}
}