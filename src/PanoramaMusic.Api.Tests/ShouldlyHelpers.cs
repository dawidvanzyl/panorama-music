using Shouldly;

namespace PanoramaMusic.Api.Tests;

internal static class ShouldlyHelpers
{
	internal static void Satisfy(params Action[] actions)
	{
		ShouldSatisfyAllConditionsTestExtensions.ShouldSatisfyAllConditions(actions);
	}
}