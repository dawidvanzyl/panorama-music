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
		var coordinator = await CreateClientAsync("banking-masked", "10.0.62.1", Role.Coordinator);
		var bankingCoordinator = await CreateClientAsync("banking-masked-bc", "10.0.62.15", Role.BankingCoordinator);
		var teacher = await CreateTeacherAsync(coordinator, "Thandi", "Mokoena");
		await CaptureBankingAsync(bankingCoordinator, teacher.TeacherId);

		var recordResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedGetRequest($"/api/teachers/{teacher.TeacherId}"), TestContext.Current.CancellationToken);
		var recordBody = await recordResponse.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		var record = JsonSerializer.Deserialize<TeacherResult>(recordBody, _jsonOptions);

		var listResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedGetRequest("/api/teachers"), TestContext.Current.CancellationToken);
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
	public async Task RevealAccountNumber_BankingCoordinator_ReturnsTheFullAccountNumber()
	{
		var bankingCoordinator = await CreateClientAsync("banking-reveal-bc", "10.0.62.2", Role.BankingCoordinator);
		var teacher = await CreateTeacherAsync(bankingCoordinator, "Sipho", "Nkosi");
		await CaptureBankingAsync(bankingCoordinator, teacher.TeacherId);

		var response = await bankingCoordinator.Client.SendAsync(
			bankingCoordinator.AuthorizedPostRequest($"/api/teachers/{teacher.TeacherId}/banking/reveal"),
			TestContext.Current.CancellationToken);
		var revealed = await response.Content.ReadFromJsonAsync<RevealedAccountNumberResult>(_jsonOptions, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => revealed.ShouldNotBeNull().AccountNumber.ShouldBe(_accountNumber));
	}

	[Fact]
	[Trait("AC", "233UC5")]
	public async Task RevealAccountNumber_CallerWithoutBankingCoordinator_IsRejectedWithForbidden()
	{
		var bankingCoordinatorSetup = await CreateClientAsync("banking-reveal-setup", "10.0.62.3", Role.BankingCoordinator);
		var teacher = await CreateTeacherAsync(bankingCoordinatorSetup, "Lerato", "Dube");
		await CaptureBankingAsync(bankingCoordinatorSetup, teacher.TeacherId);

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

		// Admin is refused the reveal too — the area grants it nothing at all.
		var admin = await CreateClientAsync("banking-reveal-admin", "10.0.62.17", Role.Admin);
		var adminRevealResponse = await admin.Client.SendAsync(
			admin.AuthorizedPostRequest($"/api/teachers/{teacher.TeacherId}/banking/reveal"),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => revealResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => recordResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => activityResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => adminRevealResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden));
	}

	[Fact]
	[Trait("AC", "233UC6")]
	public async Task BankingWrites_CallerWithoutBankingCoordinator_AreAllRejectedWithForbidden()
	{
		var bankingCoordinatorSetup = await CreateClientAsync("banking-writes-setup", "10.0.62.5", Role.BankingCoordinator);
		var coordinatorSetup = await CreateClientAsync("banking-writes-setup-coordinator", "10.0.62.18", Role.Coordinator);
		var withDetails = await CreateTeacherAsync(coordinatorSetup, "Kagiso", "Molefe");
		await CaptureBankingAsync(bankingCoordinatorSetup, withDetails.TeacherId);
		var withoutDetails = await CreateTeacherAsync(coordinatorSetup, "Naledi", "Sithole");

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

		// Admin is refused too — the area grants it nothing at all.
		var admin = await CreateClientAsync("banking-writes-admin", "10.0.62.19", Role.Admin);
		var adminCreateResponse = await admin.Client.SendAsync(
			admin.AuthorizedPostRequest($"/api/teachers/{withoutDetails.TeacherId}/banking", CreateRequest()),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => createResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => updateResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => deleteResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => adminCreateResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden));
	}

	[Fact]
	[Trait("AC", "233UC10")]
	public async Task CreateBankingDetails_OperationFails_LeavesTheAccountNumberOutOfTheResponseAndEveryLogEntry()
	{
		var setupClient = await CreateClientAsync("banking-failure", "10.0.62.7", Role.BankingCoordinator);
		var teacher = await CreateTeacherAsync(setupClient, "Bongani", "Zulu");
		await CaptureBankingAsync(setupClient, teacher.TeacherId);

		// A second capture is refused by the domain — a genuine failure with a
		// real account number in the request, which is the case where one could
		// leak into a message or a log line.
		var captureProvider = new CaptureLoggerProvider();
		var capturingClient = fixture.CreateIsolatedClientWithCapture(captureProvider, "10.0.62.8");
		var (bankingCoordinatorEmail, _) = await fixture.SeedActiveUserAsync(_password, "banking-failure-bc", Role.BankingCoordinator);
		await capturingClient.LoginAsync(bankingCoordinatorEmail, _password);

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