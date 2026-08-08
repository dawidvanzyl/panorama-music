using Dapper;
using Microsoft.AspNetCore.DataProtection;
using Npgsql;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;
using PanoramaMusic.Teachers.Domain.Messages;
using PanoramaMusic.Teachers.Domain.ValueObjects;
using PanoramaMusic.Teachers.Infrastructure.Dtos;
using PanoramaMusic.Teachers.Infrastructure.Extensions;
using PanoramaMusic.Teachers.Infrastructure.Repositories.Bases;
using System.Security.Cryptography;

namespace PanoramaMusic.Teachers.Infrastructure.Repositories;

/// <summary>
/// The only place an account number is protected or unprotected. Keeping both
/// operations here means a handler or a route can never hold a protected
/// payload, and nothing above this layer decides when a stored number becomes
/// readable again.
/// </summary>
public class BankingDetailsRepository(
	IUnitOfWork unitOfWork,
	IDomainEventCollector domainEventCollector,
	IDataProtectionProvider dataProtectionProvider)
	: RepositoryBase(unitOfWork), IBankingDetailsRepository
{
	/// <summary>
	/// The protector purpose. Purpose-scoped by design: a payload protected for
	/// account numbers cannot be unprotected by a protector created for anything
	/// else, so a bug elsewhere cannot turn some other ciphertext into an
	/// account number or vice versa. The key identifier travels inside the
	/// payload, so nothing is stored alongside it.
	/// </summary>
	private const string _protectorPurpose = "PanoramaMusic.Teachers.BankingDetails.AccountNumber";

	private const string _uniqueViolationSqlState = "23505";

	public async Task<BankingDetails?> GetByTeacherIdAsync(Guid teacherId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"teachers.get_teacher_banking_details",
			new { p_teacher_id = teacherId },
			Transaction,
			cancellationToken);
		var dto = await Connection.QuerySingleOrDefaultAsync<BankingDetailsDto>(command);

		return dto?.MapToBankingDetails();
	}

	public async Task<IList<BankingDetails>> GetByTeacherIdsAsync(IReadOnlyCollection<Guid> teacherIds, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"teachers.get_teacher_banking_details_by_ids",
			new { p_teacher_ids = teacherIds.ToArray() },
			Transaction,
			cancellationToken);
		var dtos = await Connection.QueryAsync<BankingDetailsDto>(command);

		return [.. dtos.Select(dto => dto.MapToBankingDetails())];
	}

	public async Task CreateAsync(BankingDetails bankingDetails, CancellationToken cancellationToken)
	{
		var accountNumber = bankingDetails.AccountNumber
			?? throw new DomainException(BankingDetailMessages.AccountNumberRequired);

		var command = CreateCommandDefinition(
			"teachers.create_teacher_banking_details",
			new
			{
				p_teacher_id = bankingDetails.TeacherId,
				p_bank = bankingDetails.Bank.ToString(),
				p_account_type = bankingDetails.AccountType.ToString(),
				p_branch_code = bankingDetails.BranchCode.Value,
				p_account_number_protected = Protect(accountNumber),
				p_account_number_last4 = bankingDetails.AccountNumberLast4,
			},
			Transaction,
			cancellationToken);

		try
		{
			await Connection.ExecuteAsync(command);
		}
		catch (PostgresException exception) when (exception.SqlState == _uniqueViolationSqlState)
		{
			// Two requests can both pass the "none captured yet" read before
			// either writes; the primary key on teacher_id is what actually
			// settles it. Translating that into the same refusal the read would
			// have produced keeps the loser of the race on the 400 path instead
			// of an unexplained 500.
			throw new DomainException(BankingDetailMessages.BankingDetailsAlreadyCaptured);
		}

		domainEventCollector.Collect(bankingDetails);
	}

	public async Task UpdateAsync(BankingDetails bankingDetails, CancellationToken cancellationToken)
	{
		// A null account number means the editor kept the stored one — the
		// function's COALESCE leaves both the payload and its last four digits
		// untouched, so the two never describe different numbers.
		var accountNumber = bankingDetails.AccountNumber;

		var command = CreateCommandDefinition(
			"teachers.update_teacher_banking_details",
			new
			{
				p_teacher_id = bankingDetails.TeacherId,
				p_bank = bankingDetails.Bank.ToString(),
				p_account_type = bankingDetails.AccountType.ToString(),
				p_branch_code = bankingDetails.BranchCode.Value,
				p_account_number_protected = accountNumber is null ? null : Protect(accountNumber),
				p_account_number_last4 = accountNumber?.Last4,
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(bankingDetails);
	}

	public async Task DeleteAsync(BankingDetails bankingDetails, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"teachers.delete_teacher_banking_details",
			new { p_teacher_id = bankingDetails.TeacherId },
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(bankingDetails);
	}

	public async Task<AccountNumber?> RevealAccountNumberAsync(BankingDetails bankingDetails, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"teachers.get_teacher_protected_account_number",
			new { p_teacher_id = bankingDetails.TeacherId },
			Transaction,
			cancellationToken);
		var payload = await Connection.QuerySingleOrDefaultAsync<string>(command);

		if (payload is null)
			return null;

		domainEventCollector.Collect(bankingDetails);

		return AccountNumber.Create(Unprotect(payload));
	}

	private string Protect(AccountNumber accountNumber) =>
		CreateProtector().Protect(accountNumber.Value);

	/// <summary>
	/// The underlying failure carries the payload's own diagnostics, and the
	/// application logs structured output to standard output in deployed
	/// environments — so the original exception is not allowed to propagate or
	/// to become the inner exception of one that does.
	/// </summary>
	private string Unprotect(string payload)
	{
		try
		{
			return CreateProtector().Unprotect(payload);
		}
		catch (CryptographicException)
		{
			throw new DomainException("The stored account number could not be read.");
		}
	}

	private IDataProtector CreateProtector() =>
		dataProtectionProvider.CreateProtector(_protectorPurpose);
}