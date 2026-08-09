using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Teachers.Application.Handlers.Self;
using PanoramaMusic.Teachers.Application.Requests.Teachers;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Teachers.Tests.Application;

public class UpdateOwnTeacherProfileHandlerTests : IClassFixture<TeachersTestFixture>
{
	private readonly TeachersTestContext _context;
	private readonly UpdateOwnTeacherProfileHandler _handler;

	public UpdateOwnTeacherProfileHandlerTests(TeachersTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<UpdateOwnTeacherProfileHandler>();
	}

	[Fact]
	[Trait("AC", "235UC2")]
	public async Task HandleAsync_LinkedTeacher_PersistsTheirOwnNamesResolvedFromTheSignedInAccount()
	{
		var accountId = Guid.NewGuid();
		var teacher = TeacherFactory.CreateLinked(accountId, firstName: "Alice", surname: "Vance", isPrivate: true);
		ArrangeCaller(accountId, teacher);
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.GetByIdAsync(teacher.TeacherId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(teacher);
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.UpdateProfileAsync(It.IsAny<Teacher>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		var result = await _handler.HandleAsync(
			new UpdateTeacherProfileRequest("Alicia", "Vance-Smith"),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.ShouldNotBeNull().ShouldSatisfyAllConditions(
				() => result.TeacherId.ShouldBe(teacher.TeacherId),
				() => result.FirstName.ShouldBe("Alicia"),
				() => result.Surname.ShouldBe("Vance-Smith")),
			() => _context.Repositories.TeacherRepositoryMock.Verify(
				r => r.UpdateProfileAsync(It.IsAny<Teacher>(), TestContext.Current.CancellationToken), Times.Once));
	}

	private void ArrangeCaller(Guid accountId, Teacher teacher)
	{
		_context.Contexts.UserContextMock.SetupGet(u => u.UserId).Returns(accountId);
		_context.Repositories.TeacherRepositoryMock
			.Setup(r => r.GetByLinkedAccountIdAsync(accountId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(teacher);
		_context.Directories.AccountDirectoryMock
			.Setup(d => d.GetEmailsAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(new Dictionary<Guid, string> { [accountId] = "alice.vance@panoramamusic.school" });
	}
}