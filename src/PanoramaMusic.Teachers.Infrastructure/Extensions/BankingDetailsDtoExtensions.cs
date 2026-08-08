using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Enums;
using PanoramaMusic.Teachers.Domain.ValueObjects;
using PanoramaMusic.Teachers.Infrastructure.Dtos;

namespace PanoramaMusic.Teachers.Infrastructure.Extensions;

internal static class BankingDetailsDtoExtensions
{
	/// <summary>
	/// Rehydrates the stored record. The branch code is restored rather than
	/// re-created, so a stored value that no longer satisfies the write-path
	/// invariant cannot fail the read that includes it — and take every other
	/// teacher on the roster with it.
	/// <para>
	/// Bank and account type are still parsed strictly: an unrecognised name is
	/// a genuine mismatch between the schema and the model, not a value that has
	/// merely drifted out of shape, and there is nothing sensible to show for it.
	/// </para>
	/// </summary>
	internal static BankingDetails MapToBankingDetails(this BankingDetailsDto dto) =>
		BankingDetails.Restore(
			dto.Teacher_Id,
			Enum.Parse<Bank>(dto.Bank),
			Enum.Parse<BankAccountType>(dto.Account_Type),
			BranchCode.Restore(dto.Branch_Code),
			dto.Account_Number_Last4);
}