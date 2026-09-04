using Moq;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Tests;

public sealed class StudentsTestContext
{
	public StudentsTestContext(Func<StudentsTestContext, IServiceProvider> serviceProviderConfig)
	{
		UserContextMock.SetupGet(c => c.IsTeacher).Returns(true);

		ServiceProvider = serviceProviderConfig(this)
			?? throw new ArgumentNullException(nameof(serviceProviderConfig));
	}

	public RepositoryMocks Repositories { get; } = new RepositoryMocks();

	/// <summary>
	/// The caller the handlers under test run as. Defaults to a Teacher, whose
	/// rights are unrestricted, so a test says so explicitly when it wants the
	/// narrower caller.
	/// </summary>
	public Mock<IUserContext> UserContextMock { get; } = new Mock<IUserContext>();

	/// <summary>
	/// Runs the rest of this test as a caller who holds Coordinator but not
	/// Teacher — the one the guardian maintenance scope restricts.
	/// </summary>
	public void ActAsCoordinator() => UserContextMock.SetupGet(c => c.IsTeacher).Returns(false);

	public IServiceProvider ServiceProvider { get; }

	public class RepositoryMocks
	{
		public Mock<IStudentRepository> StudentRepositoryMock { get; } = new Mock<IStudentRepository>();

		public Mock<ISiblingRepository> SiblingRepositoryMock { get; } = new Mock<ISiblingRepository>();

		public Mock<IGuardianRepository> GuardianRepositoryMock { get; } = new Mock<IGuardianRepository>();

		public Mock<IStudentGuardianRepository> StudentGuardianRepositoryMock { get; } = new Mock<IStudentGuardianRepository>();

		public Mock<IGuardianRelationshipRepository> GuardianRelationshipRepositoryMock { get; } = new Mock<IGuardianRelationshipRepository>();

		public Mock<ILessonStructureRepository> LessonStructureRepositoryMock { get; } = new Mock<ILessonStructureRepository>();

		public Mock<ICourseRepository> CourseRepositoryMock { get; } = new Mock<ICourseRepository>();

		public Mock<IStudentCourseRepository> StudentCourseRepositoryMock { get; } = new Mock<IStudentCourseRepository>();

		public Mock<IExtraCurricularRepository> ExtraCurricularRepositoryMock { get; } = new Mock<IExtraCurricularRepository>();

		public Mock<IStudentExtraCurricularRepository> StudentExtraCurricularRepositoryMock { get; } = new Mock<IStudentExtraCurricularRepository>();

		public Mock<IWaitingListRepository> WaitingListRepositoryMock { get; } = new Mock<IWaitingListRepository>();

		/// <summary>
		/// Not a repository of this context's own, but the port it reads teachers
		/// through — mocked here alongside them because that is what the handlers
		/// under test resolve.
		/// </summary>
		public Mock<ITeacherDirectory> TeacherDirectoryMock { get; } = new Mock<ITeacherDirectory>();
	}
}