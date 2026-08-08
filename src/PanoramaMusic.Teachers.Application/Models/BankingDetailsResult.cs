using PanoramaMusic.Teachers.Domain.Enums;

namespace PanoramaMusic.Teachers.Application.Models;

/// <summary>
/// A teacher's banking details as any ordinary read returns them. There is no
/// account-number field — only its last four digits — so no endpoint that
/// returns this shape can leak the number, whatever the caller's role.
/// </summary>
public sealed record BankingDetailsResult(
	Bank Bank,
	BankAccountType AccountType,
	string BranchCode,
	string AccountNumberLast4);