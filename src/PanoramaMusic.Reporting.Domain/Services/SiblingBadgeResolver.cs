using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Services;

public sealed class SiblingBadgeResolver
{
	public IReadOnlyDictionary<Guid, SiblingBadge> Resolve(
		IReadOnlyList<Guid> reportOrder, IReadOnlyList<SiblingGroupMembership> memberships)
	{
		var position = new Dictionary<Guid, int>(reportOrder.Count);
		for (var i = 0; i < reportOrder.Count; i++)
		{
			position.TryAdd(reportOrder[i], i);
		}

		var present = memberships.Where(membership => position.ContainsKey(membership.StudentId)).ToList();

		var groups = present
			.GroupBy(membership => membership.GroupKey)
			.Where(group => group.Count() >= 2)
			.OrderBy(group => group.Min(membership => position[membership.StudentId]))
			.ToList();

		var badges = new Dictionary<Guid, SiblingBadge>();
		for (var groupIndex = 0; groupIndex < groups.Count; groupIndex++)
		{
			var groupNumber = groupIndex + 1;
			var members = groups[groupIndex]
				.OrderBy(membership => membership.DateOfBirth)
				.ThenBy(membership => position[membership.StudentId])
				.ToList();

			for (var ordinalIndex = 0; ordinalIndex < members.Count; ordinalIndex++)
			{
				badges[members[ordinalIndex].StudentId] = new SiblingBadge(groupNumber, ordinalIndex + 1);
			}
		}

		return badges;
	}
}
