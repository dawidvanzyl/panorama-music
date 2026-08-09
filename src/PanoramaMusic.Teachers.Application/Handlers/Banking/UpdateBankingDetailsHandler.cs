using PanoramaMusic.Teachers.Application.Commands.Banking;
using PanoramaMusic.Teachers.Application.Extensions;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;
using PanoramaMusic.Teachers.Domain.Messages;
using PanoramaMusic.Teachers.Domain.ValueObjects;

namespace PanoramaMusic.Teachers.Application.Handlers.Banking;

public sealed class UpdateBankingDetailsHandler(IBankingDetailsRepository bankingDetailsRepository)
{
	public async Task<BankingDetailsResult> HandleAsync(UpdateBankingDetailsCommand command, CancellationToken cancellationToken)
	{
		var bankingDetails = await bankingDetailsRepository.GetByTeacherIdAsync(command.TeacherId, cancellationToken)
			?? throw new EntityNotFoundException(BankingDetailMessages.BankingDetailsNotCaptured);

		var request = command.Request;

		// An omitted account number means the editor kept the stored one — the
		// form cannot read it back, so absence is how "unchanged" is expressed.
		var accountNumber = string.IsNullOrWhiteSpace(request.AccountNumber)
			? null
			: AccountNumber.Create(request.AccountNumber);

		bankingDetails.Amend(
			request.Bank,
			request.AccountType,
			BranchCode.Create(request.BranchCode),
			accountNumber);

		await bankingDetailsRepository.UpdateAsync(bankingDetails, cancellationToken);

		return bankingDetails.ToResult();
	}
}