using PanoramaMusic.Reporting.Domain.Services;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Domain;

public class SiblingBadgeResolverTests
{
	private readonly SiblingBadgeResolver _resolver = new();

	[Fact]
	[Trait("AC", "319UC2")]
	public void Resolve_StudentWhoseGroupHasNoOtherMemberInTheReport_CarriesNoBadge()
	{
		var alone = Guid.NewGuid();
		var groupKey = Guid.NewGuid();
		var reportOrder = new List<Guid> { alone };
		var memberships = new List<SiblingGroupMembership> { new(alone, groupKey, new DateOnly(2015, 1, 1)) };

		var badges = _resolver.Resolve(reportOrder, memberships);

		badges.ShouldNotContainKey(alone);
	}

	[Fact]
	[Trait("AC", "319UC3")]
	public void Resolve_ThreeMembersBornInThreeDifferentYearsInNonAgeOrder_OrdinalsFollowAgeEldestFirst()
	{
		var born2013 = Guid.NewGuid();
		var born2015 = Guid.NewGuid();
		var born2016 = Guid.NewGuid();
		var groupKey = Guid.NewGuid();
		// Report order is not age order.
		var reportOrder = new List<Guid> { born2016, born2013, born2015 };
		var memberships = new List<SiblingGroupMembership>
		{
			new(born2016, groupKey, new DateOnly(2016, 1, 1)),
			new(born2013, groupKey, new DateOnly(2013, 1, 1)),
			new(born2015, groupKey, new DateOnly(2015, 1, 1)),
		};

		var badges = _resolver.Resolve(reportOrder, memberships);

		ShouldlyHelpers.Satisfy(
			() => badges[born2013].Ordinal.ShouldBe(1),
			() => badges[born2015].Ordinal.ShouldBe(2),
			() => badges[born2016].Ordinal.ShouldBe(3));
	}

	[Fact]
	[Trait("AC", "319UC4")]
	public void Resolve_TwoMembersSharingADateOfBirth_OrdinalsFollowReportPositionAndNeverChange()
	{
		var first = Guid.NewGuid();
		var second = Guid.NewGuid();
		var groupKey = Guid.NewGuid();
		var sharedDateOfBirth = new DateOnly(2014, 6, 1);
		var reportOrder = new List<Guid> { first, second };
		var memberships = new List<SiblingGroupMembership>
		{
			new(first, groupKey, sharedDateOfBirth),
			new(second, groupKey, sharedDateOfBirth),
		};

		var badges = _resolver.Resolve(reportOrder, memberships);
		var reversedBadges = _resolver.Resolve(reportOrder, [.. memberships.AsEnumerable().Reverse()]);

		ShouldlyHelpers.Satisfy(
			() => badges[first].Ordinal.ShouldBe(1),
			() => badges[second].Ordinal.ShouldBe(2),
			() => reversedBadges[first].Ordinal.ShouldBe(1),
			() => reversedBadges[second].Ordinal.ShouldBe(2));
	}

	[Fact]
	[Trait("AC", "319UC5")]
	public void Resolve_TwoGroups_TheGroupWhoseFirstMemberAppearsEarlierIsGroupOne()
	{
		var earlyGroupFirst = Guid.NewGuid();
		var earlyGroupSecond = Guid.NewGuid();
		var lateGroupFirst = Guid.NewGuid();
		var lateGroupSecond = Guid.NewGuid();

		// The late group's key sorts before the early group's, and its rows
		// arrive first, but report order still decides numbering.
		var lateGroupKey = Guid.Parse("00000000-0000-0000-0000-000000000001");
		var earlyGroupKey = Guid.Parse("ffffffff-ffff-ffff-ffff-ffffffffffff");

		var reportOrder = new List<Guid> { earlyGroupFirst, lateGroupFirst, earlyGroupSecond, lateGroupSecond };
		var memberships = new List<SiblingGroupMembership>
		{
			new(lateGroupFirst, lateGroupKey, new DateOnly(2013, 1, 1)),
			new(lateGroupSecond, lateGroupKey, new DateOnly(2015, 1, 1)),
			new(earlyGroupFirst, earlyGroupKey, new DateOnly(2012, 1, 1)),
			new(earlyGroupSecond, earlyGroupKey, new DateOnly(2016, 1, 1)),
		};

		var badges = _resolver.Resolve(reportOrder, memberships);

		ShouldlyHelpers.Satisfy(
			() => badges[earlyGroupFirst].Group.ShouldBe(1),
			() => badges[earlyGroupSecond].Group.ShouldBe(1),
			() => badges[lateGroupFirst].Group.ShouldBe(2),
			() => badges[lateGroupSecond].Group.ShouldBe(2));
	}
}