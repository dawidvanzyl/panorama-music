using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.ValueObjects;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests.Courses;
using PanoramaMusic.Students.Application.Requests.StudentCourses;
using PanoramaMusic.Students.Application.Requests.Students;
using PanoramaMusic.Students.Application.Requests.WaitingList;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Teachers.Application.Models;
using Shouldly;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;

namespace PanoramaMusic.Api.Tests;

/// <summary>
/// The Siblings tab's candidate read. It spans both student populations, which
/// the roster read deliberately does not, and it must widen candidacy without
/// widening either listing — so these exercise the real SQL rather than a mocked
/// repository: every claim here is a claim about which rows a query returns.
/// </summary>
[Collection(ApiTestCollection.Name)]
public sealed class SiblingCandidateRoutesTests(ApiTestFixture fixture)
{
	private const string _password = "TestPass123!";

	private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
	{
		Converters = { new JsonStringEnumConverter() },
	};

	[Fact]
	[Trait("AC", "304UC1")]
	[Trait("AC", "304UC2")]
	[Trait("AC", "304UC3")]
	public async Task GetSiblingCandidates_AWaitingListStudentAndAnEnrolledStudent_OffersBothCarryingTheirOwnPopulation()
	{
		var (coordinatorEmail, _) = await fixture.SeedActiveUserAsync(_password, "sibling-candidates-both-coordinator", Role.Coordinator);
		var coordinatorClient = fixture.CreateIsolatedClient("10.0.74.1");
		await coordinatorClient.LoginAsync(coordinatorEmail, _password);
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "sibling-candidates-both-teacher", Role.Teacher);
		var teacherClient = fixture.CreateIsolatedClient("10.0.74.2");
		await teacherClient.LoginAsync(teacherEmail, _password);

		var waiting = await CaptureWaitingListStudentAsync(coordinatorClient, "Waiting", $"Candidate-{Guid.NewGuid():N}");
		var enrolled = await CreateEnrolledStudentAsync(teacherClient, coordinatorClient, "Amara", $"Candidate-{Guid.NewGuid():N}");

		var candidates = await GetCandidatesAsync(coordinatorClient);

		var waitingCandidate = candidates.SingleOrDefault(c => c.StudentId == waiting.StudentId);
		var enrolledCandidate = candidates.SingleOrDefault(c => c.StudentId == enrolled.StudentId);

		ShouldlyHelpers.Satisfy(
			() => waitingCandidate.ShouldNotBeNull(),
			() => enrolledCandidate.ShouldNotBeNull(),
			() => waitingCandidate!.Population.ShouldBe(StudentPopulation.WaitingList),
			() => enrolledCandidate!.Population.ShouldBe(StudentPopulation.Enrolled));
	}

	/// <summary>
	/// The guard. Widening the candidate read is exactly the change that leaks
	/// into a listing, so both listings are re-read in the same state the
	/// candidate read was taken from, and each is asserted to still exclude the
	/// student that belongs to the other.
	/// </summary>
	[Fact]
	[Trait("AC", "304UC4")]
	[Trait("AC", "304UC5")]
	public async Task GetSiblingCandidates_ReadInTheSameState_LeavesBothListingsExclusionsIntact()
	{
		var (coordinatorEmail, _) = await fixture.SeedActiveUserAsync(_password, "sibling-candidates-listings-coordinator", Role.Coordinator);
		var coordinatorClient = fixture.CreateIsolatedClient("10.0.74.3");
		await coordinatorClient.LoginAsync(coordinatorEmail, _password);
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "sibling-candidates-listings-teacher", Role.Teacher);
		var teacherClient = fixture.CreateIsolatedClient("10.0.74.4");
		await teacherClient.LoginAsync(teacherEmail, _password);

		var familyName = $"Listing-{Guid.NewGuid():N}";
		var waiting = await CaptureWaitingListStudentAsync(coordinatorClient, "Waiting", familyName);
		var enrolled = await CreateEnrolledStudentAsync(teacherClient, coordinatorClient, "Amara", familyName);

		// A student holding an entry alongside an enrollment. Enrolling through
		// the roster does not consume the entry, so the waiting list's exclusion
		// has an actual row to exclude here rather than nothing to find — and the
		// candidate read has to settle which of the two states such a student is
		// offered under.
		var stale = await CaptureWaitingListStudentAsync(coordinatorClient, "Stale", familyName);
		await EnrolAsync(teacherClient, coordinatorClient, stale.StudentId);

		var candidates = await GetCandidatesAsync(coordinatorClient);

		var rosterResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedGetRequest("/api/students"), TestContext.Current.CancellationToken);
		var roster = await rosterResponse.Content.ReadFromJsonAsync<List<StudentResult>>(_jsonOptions, TestContext.Current.CancellationToken);

		var waitingListResponse = await coordinatorClient.Client.SendAsync(
			coordinatorClient.AuthorizedGetRequest("/api/waiting-list"), TestContext.Current.CancellationToken);
		var waitingListPayload = await waitingListResponse.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			// The premise: all three are offered as candidates. Without it the
			// exclusions below would hold for the wrong reason.
			() => candidates.ShouldContain(c => c.StudentId == waiting.StudentId),
			() => candidates.ShouldContain(c => c.StudentId == enrolled.StudentId),
			() => candidates.ShouldContain(c => c.StudentId == stale.StudentId),
			// Enrolment is the winning state, matching the listing they appear on.
			() => candidates.Single(c => c.StudentId == stale.StudentId).Population.ShouldBe(StudentPopulation.Enrolled),
			() => roster.ShouldNotBeNull(),
			() => roster!.ShouldContain(s => s.StudentId == enrolled.StudentId),
			() => roster!.ShouldContain(s => s.StudentId == stale.StudentId),
			() => roster!.ShouldNotContain(s => s.StudentId == waiting.StudentId),
			() => waitingListPayload.ShouldContain(waiting.StudentId.ToString()),
			() => waitingListPayload.ShouldNotContain(enrolled.StudentId.ToString()),
			() => waitingListPayload.ShouldNotContain(stale.StudentId.ToString()));
	}

	/// <summary>
	/// A sibling group can span both listings, and the linked-siblings table has
	/// to say which each member is. The two rows sit in one group and differ only
	/// by the linked student's own state, so an implementation taking the state
	/// from the student the group was reached through — or from the screen it was
	/// read on — returns two identical answers and fails here.
	/// </summary>
	[Fact]
	public async Task GetSiblings_AMixedSiblingGroup_CarriesEachSiblingsOwnPopulation()
	{
		var (coordinatorEmail, _) = await fixture.SeedActiveUserAsync(_password, "sibling-group-mixed-coordinator", Role.Coordinator);
		var coordinatorClient = fixture.CreateIsolatedClient("10.0.74.9");
		await coordinatorClient.LoginAsync(coordinatorEmail, _password);
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "sibling-group-mixed-teacher", Role.Teacher);
		var teacherClient = fixture.CreateIsolatedClient("10.0.74.10");
		await teacherClient.LoginAsync(teacherEmail, _password);

		var familyName = $"Mixed-{Guid.NewGuid():N}";
		var subject = await CaptureWaitingListStudentAsync(coordinatorClient, "Subject", familyName);
		var waitingSibling = await CaptureWaitingListStudentAsync(coordinatorClient, "Waiting", familyName);
		var enrolledSibling = await CreateEnrolledStudentAsync(teacherClient, coordinatorClient, "Amara", familyName);

		await LinkSiblingAsync(coordinatorClient, subject.StudentId, waitingSibling.StudentId);
		await LinkSiblingAsync(coordinatorClient, subject.StudentId, enrolledSibling.StudentId);

		var response = await coordinatorClient.Client.SendAsync(
			coordinatorClient.AuthorizedGetRequest($"/api/students/{subject.StudentId}/siblings"),
			TestContext.Current.CancellationToken);
		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		var siblings = JsonSerializer.Deserialize<List<SiblingStudentResult>>(payload, _jsonOptions).ShouldNotBeNull();

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => siblings.Count.ShouldBe(2),
			() => siblings.Single(s => s.StudentId == waitingSibling.StudentId).Population.ShouldBe(StudentPopulation.WaitingList),
			() => siblings.Single(s => s.StudentId == enrolledSibling.StudentId).Population.ShouldBe(StudentPopulation.Enrolled));
	}

	/// <summary>
	/// Authorization matches the wizard that calls this read: a Teacher drives it
	/// from the Students screen and a Coordinator from the Waiting List, and
	/// each is proven with a session holding that role alone — a session holding
	/// both would hide a read gated on the wrong one.
	/// </summary>
	[Fact]
	[Trait("AC", "304UC6")]
	public async Task GetSiblingCandidates_TeacherAndCoordinatorArePermittedEveryOtherCallerIsRefused()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "sibling-candidates-auth-teacher", Role.Teacher);
		var teacherClient = fixture.CreateIsolatedClient("10.0.74.5");
		await teacherClient.LoginAsync(teacherEmail, _password);

		var (coordinatorEmail, _) = await fixture.SeedActiveUserAsync(_password, "sibling-candidates-auth-coordinator", Role.Coordinator);
		var coordinatorClient = fixture.CreateIsolatedClient("10.0.74.6");
		await coordinatorClient.LoginAsync(coordinatorEmail, _password);

		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "sibling-candidates-auth-admin", Role.Admin);
		var adminClient = fixture.CreateIsolatedClient("10.0.74.7");
		await adminClient.LoginAsync(adminEmail, _password);

		var (bankingEmail, _) = await fixture.SeedActiveUserAsync(_password, "sibling-candidates-auth-banking", Role.BankingCoordinator);
		var bankingClient = fixture.CreateIsolatedClient("10.0.74.8");
		await bankingClient.LoginAsync(bankingEmail, _password);

		var teacherResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedGetRequest("/api/students/sibling-candidates"), TestContext.Current.CancellationToken);
		var coordinatorResponse = await coordinatorClient.Client.SendAsync(
			coordinatorClient.AuthorizedGetRequest("/api/students/sibling-candidates"), TestContext.Current.CancellationToken);
		var adminResponse = await adminClient.Client.SendAsync(
			adminClient.AuthorizedGetRequest("/api/students/sibling-candidates"), TestContext.Current.CancellationToken);
		var bankingResponse = await bankingClient.Client.SendAsync(
			bankingClient.AuthorizedGetRequest("/api/students/sibling-candidates"), TestContext.Current.CancellationToken);
		var anonymousResponse = await fixture.CreateClient().GetAsync(
			"/api/students/sibling-candidates", TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => teacherResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => coordinatorResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => adminResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => bankingResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => anonymousResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized));
	}

	private static async Task LinkSiblingAsync(IsolatedHttpClient client, Guid studentId, Guid siblingId)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest($"/api/students/{studentId}/siblings", new { SiblingId = siblingId }),
			TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.Created);
	}

	private static async Task<List<SiblingStudentResult>> GetCandidatesAsync(IsolatedHttpClient client)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/students/sibling-candidates"), TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.OK);

		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		return JsonSerializer.Deserialize<List<SiblingStudentResult>>(payload, _jsonOptions).ShouldNotBeNull();
	}

	/// <summary>A student holding a waiting-list entry and no enrollment.</summary>
	private static async Task<WaitingListEntryResult> CaptureWaitingListStudentAsync(
		IsolatedHttpClient coordinatorClient,
		string firstName,
		string lastName)
	{
		var structure = await GetStructureAsync(coordinatorClient, LessonType.Individual, DurationType.Hour, OccurrenceType.DuringSchool);
		await EnsureInstrumentCourseAsync(coordinatorClient, structure.LessonStructureId);

		var request = new CaptureWaitingListStudentRequest(
			firstName,
			lastName,
			new DateOnly(2016, 2, 14),
			GradeType.Grade4,
			ClassType.A1,
			PhaseType.Junior,
			Language.English,
			structure.LessonStructureId,
			InstrumentType.Piano,
			null);

		var response = await coordinatorClient.Client.SendAsync(
			coordinatorClient.AuthorizedPostRequest("/api/waiting-list", request), TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.Created);

		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		return JsonSerializer.Deserialize<WaitingListEntryResult>(payload, _jsonOptions).ShouldNotBeNull();
	}

	/// <summary>
	/// A student holding a course enrollment. The course and the teacher are
	/// created by the Coordinator's session, which owns both; the student and
	/// their enrollment by the Teacher's, which owns those.
	/// </summary>
	private static async Task<StudentResult> CreateEnrolledStudentAsync(
		IsolatedHttpClient teacherClient,
		IsolatedHttpClient coordinatorClient,
		string firstName,
		string lastName)
	{
		var createResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedPostRequest(
				"/api/students",
				new CreateStudentRequest(firstName, lastName, new DateOnly(2014, 5, 12), GradeType.Grade4, ClassType.A1, PhaseType.Junior, Language.English)),
			TestContext.Current.CancellationToken);
		createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
		var student = await createResponse.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken);

		await EnrolAsync(teacherClient, coordinatorClient, student!.StudentId);

		return student;
	}

	/// <summary>
	/// Enrols an existing student on a freshly created instrument course. This is
	/// the roster's own enrolment route, which does not consume a waiting-list
	/// entry the student may hold.
	/// </summary>
	private static async Task EnrolAsync(
		IsolatedHttpClient teacherClient,
		IsolatedHttpClient coordinatorClient,
		Guid studentId)
	{
		var structure = await GetStructureAsync(coordinatorClient, LessonType.Individual, DurationType.Hour, OccurrenceType.DuringSchool);
		var course = await EnsureInstrumentCourseAsync(coordinatorClient, structure.LessonStructureId);
		var teacher = await CreateTeacherAsync(coordinatorClient, "Lindiwe", $"Mabaso-{Guid.NewGuid():N}");

		var enrollmentResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedPostRequest(
				$"/api/students/{studentId}/courses",
				new EnrollStudentRequest(course.CourseId, teacher.TeacherId, InstrumentType.Piano, StepType.Step1A, new DateOnly(2026, 1, 15))),
			TestContext.Current.CancellationToken);
		enrollmentResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
	}

	private static async Task<LessonStructureResult> GetStructureAsync(
		IsolatedHttpClient client,
		LessonType lessonType,
		DurationType durationType,
		OccurrenceType occurrenceType)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/lesson-structures"), TestContext.Current.CancellationToken);
		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		var structures = JsonSerializer.Deserialize<List<LessonStructureResult>>(payload, _jsonOptions).ShouldNotBeNull();

		return structures.Single(s =>
			s.LessonType == lessonType && s.DurationType == durationType && s.OccurrenceType == occurrenceType);
	}

	/// <summary>
	/// A student may only be captured waiting for a structure the school runs an
	/// instrument course under, and these tests capture and enrol against the same
	/// structure. It reads the catalogue before creating, because a course type and
	/// a lesson structure identify at most one course.
	/// </summary>
	private static async Task<CourseResult> EnsureInstrumentCourseAsync(IsolatedHttpClient client, Guid lessonStructureId)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/courses"), TestContext.Current.CancellationToken);
		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		var courses = JsonSerializer.Deserialize<List<CourseResult>>(payload, _jsonOptions).ShouldNotBeNull();

		var existing = courses.SingleOrDefault(course =>
			course.CourseType == CourseType.Instrument && course.LessonStructureId == lessonStructureId);

		return existing ?? await CreateCourseAsync(client, CourseType.Instrument, 450.00m, lessonStructureId);
	}

	private static async Task<CourseResult> CreateCourseAsync(
		IsolatedHttpClient client,
		CourseType courseType,
		decimal cost,
		Guid lessonStructureId)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/courses", new CreateCourseRequest(courseType, cost, lessonStructureId)),
			TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.Created);

		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		return JsonSerializer.Deserialize<CourseResult>(payload, _jsonOptions).ShouldNotBeNull();
	}

	private static async Task<TeacherResult> CreateTeacherAsync(IsolatedHttpClient client, string firstName, string surname)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/teachers", new { firstName, surname, isPrivate = false }),
			TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.Created);

		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		return JsonSerializer.Deserialize<TeacherResult>(payload, _jsonOptions).ShouldNotBeNull();
	}
}