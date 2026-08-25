using Moq;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Tests;

public sealed class StudentsTestContext
{
	public StudentsTestContext(Func<StudentsTestContext, IServiceProvider> serviceProviderConfig)
	{
		ServiceProvider = serviceProviderConfig(this)
			?? throw new ArgumentNullException(nameof(serviceProviderConfig));
	}

	public RepositoryMocks Repositories { get; } = new RepositoryMocks();

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

		/// <summary>
		/// Not a repository of this context's own, but the port it reads teachers
		/// through — mocked here alongside them because that is what the handlers
		/// under test resolve.
		/// </summary>
		public Mock<ITeacherDirectory> TeacherDirectoryMock { get; } = new Mock<ITeacherDirectory>();
	}
}