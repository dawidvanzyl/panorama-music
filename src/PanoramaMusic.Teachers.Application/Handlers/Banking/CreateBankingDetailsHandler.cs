using PanoramaMusic.Teachers.Application.Commands.Banking;
using PanoramaMusic.Teachers.Application.Extensions;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;
using PanoramaMusic.Teachers.Domain.Messages;
using PanoramaMusic.Teachers.Domain.ValueObjects;

namespace PanoramaMusic.Teachers.Application.Handlers.Banking;

public sealed class CreateBankingDetailsHandler(
	ITeacherRepository teacherRepository,
	IBankingDetailsRepository bankingDetailsRepository)
{
	public async Task<BankingDetailsResult> HandleAsync(CreateBankingDetailsCommand command, CancellationToken cancellationToken)
	{
		// The teacher is read to establish that there is one, not to consult its
		// employment classification: banking details are optional for every
		// teacher and gated by none of it.
		var teacher = await teacherRepository.GetByIdAsync(command.TeacherId, cancellationToken)
			?? throw new EntityNotFoundException($"Teacher {command.TeacherId} was not found.");

		var existing = await bankingDetailsRepository.GetByTeacherIdAsync(teacher.TeacherId, cancellationToken);

		if (existing is not null)
			throw new DomainException(BankingDetailMessages.BankingDetailsAlreadyCaptured);

		var request = command.Request;
		var bankingDetails = BankingDetails.Capture(
			teacher.TeacherId,
			request.Bank,
			request.AccountType,
			BranchCode.Create(request.BranchCode),
			AccountNumber.Create(request.AccountNumber));

		await bankingDetailsRepository.CreateAsync(bankingDetails, cancellationToken);

		return bankingDetails.ToResult();
	}
}