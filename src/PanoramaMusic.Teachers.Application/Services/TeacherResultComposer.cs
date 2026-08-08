using PanoramaMusic.Teachers.Application.Extensions;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Application.Services;

/// <summary>
/// Joins a teacher to the name of the account it is linked to and to its
/// banking details. The teacher, the account and the banking details are three
/// separate concerns — a different context owns the account, a different
/// aggregate owns the banking — so the join happens here rather than in a query
/// spanning all three.
/// </summary>
public sealed class TeacherResultComposer(
	IAccountDirectory accountDirectory,
	IBankingDetailsRepository bankingDetailsRepository)
{
	public async Task<TeacherResult> ComposeAsync(Teacher teacher, CancellationToken cancellationToken)
	{
		var results = await ComposeManyAsync([teacher], cancellationToken);

		return results[0];
	}

	/// <summary>
	/// Resolves every linked account in one directory call and every set of
	/// banking details in one query, so a roster costs two lookups rather than
	/// two per teacher.
	/// </summary>
	public async Task<IList<TeacherResult>> ComposeManyAsync(IList<Teacher> teachers, CancellationToken cancellationToken)
	{
		var linkedAccountIds = teachers
			.Where(teacher => teacher.LinkedAccountId is not null)
			.Select(teacher => teacher.LinkedAccountId!.Value)
			.ToArray();

		var emails = linkedAccountIds.Length == 0
			? new Dictionary<Guid, string>()
			: await accountDirectory.GetEmailsAsync(linkedAccountIds, cancellationToken);

		var banking = await ResolveBankingAsync(teachers, cancellationToken);

		return
		[
			.. teachers.Select(teacher => teacher.ToResult(
				EmailOf(teacher.LinkedAccountId, emails),
				BankingOf(teacher.TeacherId, banking))),
		];
	}

	/// <summary>
	/// One call scoped to exactly the teachers being composed, whether that is
	/// one record or a whole roster — so the read costs one query rather than
	/// one per teacher, and still touches only the rows the caller asked about.
	/// An empty roster reads nothing at all.
	/// </summary>
	private async Task<IReadOnlyDictionary<Guid, BankingDetailsResult>> ResolveBankingAsync(
		IList<Teacher> teachers,
		CancellationToken cancellationToken)
	{
		if (teachers.Count == 0)
			return new Dictionary<Guid, BankingDetailsResult>();

		var teacherIds = teachers.Select(teacher => teacher.TeacherId).ToArray();
		var banking = await bankingDetailsRepository.GetByTeacherIdsAsync(teacherIds, cancellationToken);

		return banking.ToDictionary(details => details.TeacherId, details => details.ToResult());
	}

	private static string? EmailOf(Guid? accountId, IReadOnlyDictionary<Guid, string> emails) =>
		accountId is not null && emails.TryGetValue(accountId.Value, out var email) ? email : null;

	private static BankingDetailsResult? BankingOf(Guid teacherId, IReadOnlyDictionary<Guid, BankingDetailsResult> banking) =>
		banking.TryGetValue(teacherId, out var details) ? details : null;
}