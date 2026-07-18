using Shouldly;

namespace PanoramaMusic.Students.Tests;

internal static class ShouldlyHelpers
{
	internal static void Satisfy(params Action[] actions)
	{
		ShouldSatisfyAllConditionsTestExtensions.ShouldSatisfyAllConditions(actions);
	}
}