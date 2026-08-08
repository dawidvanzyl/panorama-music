using FluentValidation;
using PanoramaMusic.Teachers.Application.Requests.Banking;

namespace PanoramaMusic.Teachers.Application.Validators.Banking;

/// <summary>
/// Rejects a request that could not name a bank or an account type at all. The
/// shape of a branch code and of an account number is a domain invariant
/// enforced by <c>BranchCode</c> and <c>AccountNumber</c>, not restated here —
/// duplicating it would put the same rule in two layers.
/// </summary>
public sealed class CreateBankingDetailsRequestValidator : AbstractValidator<CreateBankingDetailsRequest>
{
	public CreateBankingDetailsRequestValidator()
	{
		RuleFor(x => x.Bank)
			.IsInEnum();

		RuleFor(x => x.AccountType)
			.IsInEnum();

		RuleFor(x => x.BranchCode)
			.NotEmpty();

		RuleFor(x => x.AccountNumber)
			.NotEmpty();
	}
}