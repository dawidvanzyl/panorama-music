using PanoramaMusic.Teachers.Domain.Enums;

namespace PanoramaMusic.Teachers.Application.Requests.Banking;

public sealed record CreateBankingDetailsRequest(
	Bank Bank,
	BankAccountType AccountType,
	string BranchCode,
	string AccountNumber);