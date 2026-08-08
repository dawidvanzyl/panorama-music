using FluentValidation;
using PanoramaMusic.Teachers.Application.Requests.Banking;

namespace PanoramaMusic.Teachers.Application.Validators.Banking;

/// <summary>
/// The account number is deliberately unvalidated for presence: omitting it is
/// how an edit says "keep the stored number". Its shape, when one is supplied,
/// is <c>AccountNumber</c>'s invariant to enforce.
/// </summary>
public sealed class UpdateBankingDetailsRequestValidator : AbstractValidator<UpdateBankingDetailsRequest>
{
	public UpdateBankingDetailsRequestValidator()
	{
		RuleFor(x => x.Bank)
			.IsInEnum();

		RuleFor(x => x.AccountType)
			.IsInEnum();

		RuleFor(x => x.BranchCode)
			.NotEmpty();
	}
}