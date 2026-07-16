using Shouldly;

namespace PanoramaMusic.Identity.Tests;

public static class ShouldlyHelpers
{
	public static void Satisfy(params Action[] actions)
	{
		ShouldSatisfyAllConditionsTestExtensions.ShouldSatisfyAllConditions(actions);
	}
}