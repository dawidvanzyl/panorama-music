using PanoramaMusic.Teachers.Domain.Enums;

namespace PanoramaMusic.Teachers.Application.Requests.Banking;

/// <summary>
/// A separate shape from <see cref="CreateBankingDetailsRequest"/> because the
/// account number is optional here and required there. The stored number cannot
/// be read back into the edit form, so an edit that leaves it alone omits it
/// rather than resubmitting it — which is also the only way to edit the other
/// fields without the plaintext number crossing the wire again.
/// </summary>
public sealed record UpdateBankingDetailsRequest(
	Bank Bank,
	BankAccountType AccountType,
	string BranchCode,
	string? AccountNumber);