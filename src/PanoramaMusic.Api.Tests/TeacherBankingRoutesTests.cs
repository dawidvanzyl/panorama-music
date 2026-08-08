using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.Providers;
using PanoramaMusic.Api.Tests.ValueObjects;
using PanoramaMusic.Identity.Domain.Enums;
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
/// The authorization boundary and the response shape, exercised over the real
/// pipeline. Role checks are asserted against the endpoints themselves — hiding
/// a control in the interface is presentation and proves nothing about who can
/// actually call these.
/// </summary>
[Collection(ApiTestCollection.Name)]
public sealed class TeacherBankingRoutesTests(ApiTestFixture fixture)
{
	private const string _password = "TeacherBankingTests123!";
	private const string _accountNumber = "1234567890";

	private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
	{
		Converters = { new JsonStringEnumConverter() },
	};

	[Fact]
	[Trait("AC", "233UC3")]
	public async Task GetTeacher_BankingDetailsCaptured_ReturnsOnlyTheLastFourDigitsOnTheRecordAndTheList()
	{
		var admin = await CreateClientAsync("banking-masked", "10.0.62.1", Role.Admin);
		var teacher = await CreateTeacherAsync(admin, "Thandi", "Mokoena");
		await CaptureBankingAsync(admin, teacher.TeacherId);

		var recordResponse = await admin.Client.SendAsync(
			admin.AuthorizedGetRequest($"/api/teachers/{teacher.TeacherId}"), TestContext.Current.CancellationToken);
		var recordBody = await recordResponse.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		var record = JsonSerializer.Deserialize<TeacherResult>(recordBody, _jsonOptions);

		var listResponse = await admin.Client.SendAsync(
			admin.AuthorizedGetRequest("/api/teachers"), TestContext.Current.CancellationToken);
		var listBody = await listResponse.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

		record.ShouldNotBeNull();
		record.Banking.ShouldNotBeNull();
		ShouldlyHelpers.Satisfy(
			() => record.Banking.AccountNumberLast4.ShouldBe("7890"),
			() => record.Banking.Bank.ShouldBe(Bank.StandardBank),
			() => record.Banking.BranchCode.ShouldBe("051001"),
			() => recordBody.ShouldNotContain(_accountNumber),
			() => listBody.ShouldNotContain(_accountNumber));
	}

	[Fact]
	[Trait("AC", "233UC4")]
	public async Task RevealAccountNumber_Admin_ReturnsTheFullAccountNumber()
	{
		var admin = await CreateClientAsync("banking-reveal-admin", "10.0.62.2", Role.Admin);
		var teacher = await CreateTeacherAsync(admin, "Sipho", "Nkosi");
		await CaptureBankingAsync(admin, teacher.TeacherId);

		var response = await admin.Client.SendAsync(
			admin.AuthorizedPostRequest($"/api/teachers/{teacher.TeacherId}/banking/reveal"),
			TestContext.Current.CancellationToken);
		var revealed = await response.Content.ReadFromJsonAsync<RevealedAccountNumberResult>(_jsonOptions, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => revealed.ShouldNotBeNull().AccountNumber.ShouldBe(_accountNumber));
	}

	[Fact]
	[Trait("AC", "233UC5")]
	public async Task RevealAccountNumber_Coordinator_IsRejectedWithForbidden()
	{
		var admin = await CreateClientAsync("banking-reveal-setup", "10.0.62.3", Role.Admin);
		var teacher = await CreateTeacherAsync(admin, "Lerato", "Dube");
		await CaptureBankingAsync(admin, teacher.TeacherId);

		var coordinator = await CreateClientAsync("banking-reveal-coordinator", "10.0.62.4", Role.Coordinator);

		var revealResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedPostRequest($"/api/teachers/{teacher.TeacherId}/banking/reveal"),
			TestContext.Current.CancellationToken);

		// The masked value and the banking activity stay available — a Coordinator
		// is refused the reveal, not the record.
		var recordResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedGetRequest($"/api/teachers/{teacher.TeacherId}"), TestContext.Current.CancellationToken);
		var activityResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedGetRequest($"/api/teachers/{teacher.TeacherId}/banking/activity"), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => revealResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => recordResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => activityResponse.StatusCode.ShouldBe(HttpStatusCode.OK));
	}

	[Fact]
	[Trait("AC", "233UC6")]
	public async Task BankingWrites_Coordinator_AreAllRejectedWithForbidden()
	{
		var admin = await CreateClientAsync("banking-writes-setup", "10.0.62.5", Role.Admin);
		var withDetails = await CreateTeacherAsync(admin, "Kagiso", "Molefe");
		await CaptureBankingAsync(admin, withDetails.TeacherId);
		var withoutDetails = await CreateTeacherAsync(admin, "Naledi", "Sithole");

		var coordinator = await CreateClientAsync("banking-writes-coordinator", "10.0.62.6", Role.Coordinator);

		var createResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedPostRequest($"/api/teachers/{withoutDetails.TeacherId}/banking", CreateRequest()),
			TestContext.Current.CancellationToken);
		var updateResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedPutRequest(
				$"/api/teachers/{withDetails.TeacherId}/banking",
				new UpdateBankingDetailsRequest(Bank.Absa, BankAccountType.ChequeCurrent, "632005", null)),
			TestContext.Current.CancellationToken);
		var deleteResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedDeleteRequest($"/api/teachers/{withDetails.TeacherId}/banking"),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => createResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => updateResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => deleteResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden));
	}

	[Fact]
	[Trait("AC", "233UC10")]
	public async Task CreateBankingDetails_OperationFails_LeavesTheAccountNumberOutOfTheResponseAndEveryLogEntry()
	{
		var setupClient = await CreateClientAsync("banking-failure", "10.0.62.7", Role.Admin);
		var teacher = await CreateTeacherAsync(setupClient, "Bongani", "Zulu");
		await CaptureBankingAsync(setupClient, teacher.TeacherId);

		// A second capture is refused by the domain — a genuine failure with a
		// real account number in the request, which is the case where one could
		// leak into a message or a log line.
		var captureProvider = new CaptureLoggerProvider();
		var capturingClient = fixture.CreateIsolatedClientWithCapture(captureProvider, "10.0.62.8");
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "banking-failure-admin", Role.Admin);
		await capturingClient.LoginAsync(adminEmail, _password);

		var response = await capturingClient.Client.SendAsync(
			capturingClient.AuthorizedPostRequest($"/api/teachers/{teacher.TeacherId}/banking", CreateRequest()),
			TestContext.Current.CancellationToken);
		var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

		var logText = string.Join(
			'\n',
			captureProvider.Entries.Select(entry => $"{entry.Message}|{entry.Exception}|{string.Join(',', entry.Properties.Select(p => $"{p.Key}={p.Value}"))}"));

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.BadRequest),
			() => body.ShouldNotContain(_accountNumber),
			() => logText.ShouldNotContain(_accountNumber));
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

	private static async Task<TeacherResult> CreateTeacherAsync(IsolatedHttpClient client, string firstName, string surname)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/teachers", new CreateTeacherRequest(firstName, surname, IsPrivate: false)),
			TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.Created);

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