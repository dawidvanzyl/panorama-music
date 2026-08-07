using PanoramaMusic.Teachers.Application.Extensions;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Application.Services;

/// <summary>
/// Joins a teacher to the name of the account it is linked to. The teacher and
/// the account are owned by different contexts, so the join happens here rather
/// than in a query spanning both schemas.
/// </summary>
public sealed class TeacherResultComposer(IAccountDirectory accountDirectory)
{
	public async Task<TeacherResult> ComposeAsync(Teacher teacher, CancellationToken cancellationToken)
	{
		var results = await ComposeManyAsync([teacher], cancellationToken);

		return results[0];
	}

	/// <summary>
	/// Resolves every linked account in one directory call, so a roster costs one
	/// lookup rather than one per linked teacher.
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

		return [.. teachers.Select(teacher => teacher.ToResult(EmailOf(teacher.LinkedAccountId, emails)))];
	}

	private static string? EmailOf(Guid? accountId, IReadOnlyDictionary<Guid, string> emails) =>
		accountId is not null && emails.TryGetValue(accountId.Value, out var email) ? email : null;
}