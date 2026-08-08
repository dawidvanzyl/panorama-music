using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Enums;
using PanoramaMusic.Teachers.Domain.ValueObjects;
using PanoramaMusic.Teachers.Infrastructure.Dtos;

namespace PanoramaMusic.Teachers.Infrastructure.Extensions;

internal static class BankingDetailsDtoExtensions
{
	/// <summary>
	/// Rehydrates the stored record. Bank and account type are persisted as the
	/// enum names, so a value the domain no longer recognises is a genuine
	/// mismatch between the schema and the model rather than something to
	/// silently coerce.
	/// </summary>
	internal static BankingDetails MapToBankingDetails(this BankingDetailsDto dto) =>
		BankingDetails.Restore(
			dto.Teacher_Id,
			Enum.Parse<Bank>(dto.Bank),
			Enum.Parse<BankAccountType>(dto.Account_Type),
			BranchCode.Create(dto.Branch_Code),
			dto.Account_Number_Last4);
}