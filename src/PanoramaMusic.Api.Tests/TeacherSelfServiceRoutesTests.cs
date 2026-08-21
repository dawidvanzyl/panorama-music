using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.ValueObjects;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Teachers.Application.Constants;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Application.Requests.Banking;
using PanoramaMusic.Teachers.Application.Requests.Teachers;
using PanoramaMusic.Teachers.Domain.Enums;
using Shouldly;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;

namespace PanoramaMusic.Api.Tests;

/// <summary>
/// What a teacher can and cannot do to their own record, exercised over the real
/// pipeline. The self-service endpoints take no teacher id, so the tests that
/// matter most here are the ones asserting what a teacher gets when they reach
/// past their own record: those go through the role-gated endpoints, which is
/// where the refusal actually lives.
/// </summary>
[Collection(ApiTestCollection.Name)]
public sealed class TeacherSelfServiceRoutesTests(ApiTestFixture fixture)
{
	private const string _password = "TeacherSelfServiceTests123!";
	private const string _accountNumber = "1234567890";

	private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
	{
		Converters = { new JsonStringEnumConverter() },
	};

	[Fact]
	[Trait("AC", "235UC1")]
	public async Task GetOwnTeacher_LinkedTeacher_ReturnsTheirProfileAndMaskedBankingDetails()
	{
		var admin = await CreateClientAsync("self-get-admin", "10.0.63.1", Role.Admin);
		var (teacher, teacherClient, _) = await CreateLinkedTeacherAsync(admin, "self-get", "10.0.63.2", "Thandi", "Mokoena");
		await CaptureBankingAsync(admin, teacher.TeacherId);

		var response = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedGetRequest("/api/teachers/me"), TestContext.Current.CancellationToken);
		var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		var own = JsonSerializer.Deserialize<TeacherResult>(body, _jsonOptions);

		own.ShouldNotBeNull();
		own.Banking.ShouldNotBeNull();
		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => own.TeacherId.ShouldBe(teacher.TeacherId),
			() => own.FirstName.ShouldBe("Thandi"),
			() => own.Surname.ShouldBe("Mokoena"),
			() => own.Banking.AccountNumberLast4.ShouldBe("7890"),
			() => body.ShouldNotContain(_accountNumber));
	}

	[Fact]
	[Trait("AC", "235UC3")]
	public async Task OwnBankingWrites_LinkedTeacher_SucceedAndAreAuditedAgainstTheirOwnAccount()
	{
		var admin = await CreateClientAsync("self-banking-admin", "10.0.63.3", Role.Admin);
		var (_, teacherClient, teacherEmail) = await CreateLinkedTeacherAsync(admin, "self-banking", "10.0.63.4", "Sipho", "Nkosi");

		var createResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedPostRequest("/api/teachers/me/banking", CreateRequest()),
			TestContext.Current.CancellationToken);
		var updateResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedPutRequest(
				"/api/teachers/me/banking",
				new UpdateBankingDetailsRequest(Bank.Absa, BankAccountType.ChequeCurrent, "632005", null)),
			TestContext.Current.CancellationToken);
		var deleteResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedDeleteRequest("/api/teachers/me/banking"),
			TestContext.Current.CancellationToken);

		var captured = await admin.GetAuditPageAsync(teacherEmail, TeacherAuditEventTypes.BankingDetailsCaptured, 1, 10);
		var amended = await admin.GetAuditPageAsync(teacherEmail, TeacherAuditEventTypes.BankingDetailsAmended, 1, 10);
		var deleted = await admin.GetAuditPageAsync(teacherEmail, TeacherAuditEventTypes.BankingDetailsDeleted, 1, 10);

		ShouldlyHelpers.Satisfy(
			() => createResponse.StatusCode.ShouldBe(HttpStatusCode.Created),
			() => updateResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => deleteResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent),
			() => captured.Items.ShouldHaveSingleItem().ActorEmail.ShouldBe(teacherEmail),
			() => amended.Items.ShouldHaveSingleItem().ActorEmail.ShouldBe(teacherEmail),
			() => deleted.Items.ShouldHaveSingleItem().ActorEmail.ShouldBe(teacherEmail));
	}

	[Fact]
	[Trait("AC", "235UC4")]
	public async Task RevealOwnAccountNumber_LinkedTeacher_ReturnsTheFullNumberAndRecordsTheRevealAgainstThem()
	{
		var admin = await CreateClientAsync("self-reveal-admin", "10.0.63.5", Role.Admin);
		var (teacher, teacherClient, teacherEmail) = await CreateLinkedTeacherAsync(admin, "self-reveal", "10.0.63.6", "Lerato", "Dube");
		await CaptureBankingAsync(admin, teacher.TeacherId);

		var response = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedPostRequest("/api/teachers/me/banking/reveal"),
			TestContext.Current.CancellationToken);
		var revealed = await response.Content.ReadFromJsonAsync<RevealedAccountNumberResult>(
			_jsonOptions, TestContext.Current.CancellationToken);

		var reveals = await admin.GetAuditPageAsync(teacherEmail, TeacherAuditEventTypes.BankingDetailsRevealed, 1, 10);

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => revealed.ShouldNotBeNull().AccountNumber.ShouldBe(_accountNumber),
			() => reveals.Items.ShouldHaveSingleItem().ActorEmail.ShouldBe(teacherEmail));
	}

	/// <summary>
	/// The record a teacher does not own. Every route that names a teacher id is
	/// gated on Coordinator or Admin, so a teacher supplying somebody else's is
	/// refused before anything is read — including, deliberately, when the id is
	/// their own: self-service goes through <c>/api/teachers/me</c> and nothing
	/// else.
	/// </summary>
	[Fact]
	[Trait("AC", "235UC5")]
	public async Task TeacherIdRoutes_LinkedTeacher_AreRefusedForAnotherTeachersRecordAndBanking()
	{
		var admin = await CreateClientAsync("self-other-admin", "10.0.63.7", Role.Admin);
		var other = await CreateTeacherAsync(admin, "Kagiso", "Molefe");
		await CaptureBankingAsync(admin, other.TeacherId);
		var (_, teacherClient, _) = await CreateLinkedTeacherAsync(admin, "self-other", "10.0.63.8", "Naledi", "Sithole");

		var rosterResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedGetRequest("/api/teachers/roster"), TestContext.Current.CancellationToken);
		var listResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedGetRequest("/api/teachers"), TestContext.Current.CancellationToken);
		var recordResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedGetRequest($"/api/teachers/{other.TeacherId}"), TestContext.Current.CancellationToken);
		var profileResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedPutRequest(
				$"/api/teachers/{other.TeacherId}/profile",
				new UpdateTeacherProfileRequest("Hijacked", "Name")),
			TestContext.Current.CancellationToken);
		var bankingResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedPutRequest(
				$"/api/teachers/{other.TeacherId}/banking",
				new UpdateBankingDetailsRequest(Bank.Absa, BankAccountType.ChequeCurrent, "632005", null)),
			TestContext.Current.CancellationToken);
		var revealResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedPostRequest($"/api/teachers/{other.TeacherId}/banking/reveal"),
			TestContext.Current.CancellationToken);

		var unchanged = await GetTeacherAsync(admin, other.TeacherId);

		ShouldlyHelpers.Satisfy(
			// The roster read is open to a Teacher — assigning a teacher to a
			// student's enrollment needs it — but it names teachers and nothing more.
			// The full list, which also carries account emails and banking, does not
			// widen with it.
			() => rosterResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => listResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => recordResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => profileResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => bankingResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => revealResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => unchanged.FirstName.ShouldBe("Kagiso"));
	}

	[Fact]
	[Trait("AC", "235UC6")]
	public async Task UpdateClassification_LinkedTeacherOnTheirOwnRecord_IsRefusedAndTheClassificationIsUnchanged()
	{
		var admin = await CreateClientAsync("self-classification-admin", "10.0.63.9", Role.Admin);
		var (teacher, teacherClient, _) = await CreateLinkedTeacherAsync(
			admin, "self-classification", "10.0.63.10", "Bongani", "Zulu");

		var response = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedPutRequest(
				$"/api/teachers/{teacher.TeacherId}/classification",
				new UpdateTeacherClassificationRequest(IsPrivate: true)),
			TestContext.Current.CancellationToken);

		var unchanged = await GetTeacherAsync(admin, teacher.TeacherId);

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => unchanged.IsPrivate.ShouldBeFalse());
	}

	[Fact]
	[Trait("AC", "235UC7")]
	public async Task AccountLinkRoutes_LinkedTeacherOnTheirOwnRecord_AreRefusedAndTheLinkIsUnchanged()
	{
		var admin = await CreateClientAsync("self-link-admin", "10.0.63.11", Role.Admin);
		var (teacher, teacherClient, _) = await CreateLinkedTeacherAsync(admin, "self-link", "10.0.63.12", "Nomsa", "Khumalo");
		var (_, otherAccountId) = await fixture.SeedActiveUserAsync(_password, "self-link-other-account", Role.Teacher);

		var relinkResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedPutRequest(
				$"/api/teachers/{teacher.TeacherId}/account",
				new LinkTeacherAccountRequest(otherAccountId)),
			TestContext.Current.CancellationToken);
		var unlinkResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedDeleteRequest($"/api/teachers/{teacher.TeacherId}/account"),
			TestContext.Current.CancellationToken);

		var unchanged = await GetTeacherAsync(admin, teacher.TeacherId);

		ShouldlyHelpers.Satisfy(
			() => relinkResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => unlinkResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => unchanged.LinkedAccountId.ShouldNotBeNull(),
			() => unchanged.LinkedAccountId.ShouldNotBe(otherAccountId));
	}

	[Fact]
	[Trait("AC", "235UC8")]
	public async Task GetOwnTeacher_AccountLinkedToNoTeacher_IsRefusedWithoutReturningAnyRecord()
	{
		var admin = await CreateClientAsync("self-unlinked-admin", "10.0.63.13", Role.Admin);
		await CreateTeacherAsync(admin, "Pumla", "Ndlovu");
		var unlinked = await CreateClientAsync("self-unlinked", "10.0.63.14", Role.Teacher);

		var response = await unlinked.Client.SendAsync(
			unlinked.AuthorizedGetRequest("/api/teachers/me"), TestContext.Current.CancellationToken);
		var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.NotFound),
			() => body.ShouldNotContain("Pumla"));
	}

	private static CreateBankingDetailsRequest CreateRequest() =>
		new(Bank.StandardBank, BankAccountType.Savings, "051001", _accountNumber);

	private async Task<IsolatedHttpClient> CreateClientAsync(string emailPrefix, string simulatedIp, Role role)
	{
		var (email, _) = await fixture.SeedActiveUserAsync(_password, emailPrefix, role);
		var client = fixture.CreateIsolatedClient(simulatedIp);
		await client.LoginAsync(email, _password);

		return client;
	}

	/// <summary>
	/// A teacher record, a Teacher-role account, the link between them, and a
	/// client signed in as that account — the whole starting position every
	/// self-service test needs.
	/// </summary>
	private async Task<(TeacherResult Teacher, IsolatedHttpClient Client, string Email)> CreateLinkedTeacherAsync(
		IsolatedHttpClient admin,
		string emailPrefix,
		string simulatedIp,
		string firstName,
		string surname)
	{
		var (email, accountId) = await fixture.SeedActiveUserAsync(_password, emailPrefix, Role.Teacher);
		var teacher = await CreateTeacherAsync(admin, firstName, surname);

		var linkResponse = await admin.Client.SendAsync(
			admin.AuthorizedPutRequest($"/api/teachers/{teacher.TeacherId}/account", new LinkTeacherAccountRequest(accountId)),
			TestContext.Current.CancellationToken);
		linkResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

		var client = fixture.CreateIsolatedClient(simulatedIp);
		await client.LoginAsync(email, _password);

		return (teacher, client, email);
	}

	private static async Task<TeacherResult> CreateTeacherAsync(IsolatedHttpClient client, string firstName, string surname)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/teachers", new CreateTeacherRequest(firstName, surname, IsPrivate: false)),
			TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.Created);

		return (await response.Content.ReadFromJsonAsync<TeacherResult>(_jsonOptions, TestContext.Current.CancellationToken))!;
	}

	private static async Task<TeacherResult> GetTeacherAsync(IsolatedHttpClient client, Guid teacherId)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest($"/api/teachers/{teacherId}"), TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.OK);

		return (await response.Content.ReadFromJsonAsync<TeacherResult>(_jsonOptions, TestContext.Current.CancellationToken))!;
	}

	private static async Task CaptureBankingAsync(IsolatedHttpClient client, Guid teacherId)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest($"/api/teachers/{teacherId}/banking", CreateRequest()),
			TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.Created);
	}
}