using PanoramaMusic.Teachers.Application.Commands.Banking;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;
using PanoramaMusic.Teachers.Domain.Messages;

namespace PanoramaMusic.Teachers.Application.Handlers.Banking;

public sealed class DeleteBankingDetailsHandler(IBankingDetailsRepository bankingDetailsRepository)
{
	public async Task HandleAsync(DeleteBankingDetailsCommand command, CancellationToken cancellationToken)
	{
		var bankingDetails = await bankingDetailsRepository.GetByTeacherIdAsync(command.TeacherId, cancellationToken)
			?? throw new EntityNotFoundException(BankingDetailMessages.BankingDetailsNotCaptured);

		bankingDetails.Delete();

		await bankingDetailsRepository.DeleteAsync(bankingDetails, cancellationToken);
	}
}