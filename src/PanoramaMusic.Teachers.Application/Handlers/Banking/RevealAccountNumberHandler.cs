using PanoramaMusic.Teachers.Application.Commands.Banking;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;
using PanoramaMusic.Teachers.Domain.Messages;

namespace PanoramaMusic.Teachers.Application.Handlers.Banking;

/// <summary>
/// The one use case that returns a full account number. It raises the reveal
/// event before the unprotect happens, so the record of the reveal is written
/// on the same transaction as the reveal itself — an attempt that fails or
/// rolls back leaves neither a returned number nor an audit entry claiming one
/// was returned.
/// </summary>
public sealed class RevealAccountNumberHandler(IBankingDetailsRepository bankingDetailsRepository)
{
	public async Task<RevealedAccountNumberResult> HandleAsync(RevealAccountNumberCommand command, CancellationToken cancellationToken)
	{
		var bankingDetails = await bankingDetailsRepository.GetByTeacherIdAsync(command.TeacherId, cancellationToken)
			?? throw new EntityNotFoundException(BankingDetailMessages.BankingDetailsNotCaptured);

		bankingDetails.Reveal();

		var accountNumber = await bankingDetailsRepository.RevealAccountNumberAsync(bankingDetails, cancellationToken)
			?? throw new EntityNotFoundException(BankingDetailMessages.BankingDetailsNotCaptured);

		return new RevealedAccountNumberResult(accountNumber.Value);
	}
}