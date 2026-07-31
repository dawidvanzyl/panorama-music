using Shouldly;

namespace PanoramaMusic.Api.Tests;

internal static class ShouldlyHelpers
{
	/// <summary>
	/// The explicit <see langword="null"/> receiver is load-bearing. Shouldly only exposes
	/// <c>ShouldSatisfyAllConditions(this object? actual, params Action[] conditions)</c>, so
	/// passing the array as the sole argument binds it to <c>actual</c> and leaves
	/// <c>conditions</c> empty — every condition is then silently discarded and the assertion
	/// always passes. Do not "simplify" this call.
	/// </summary>
	internal static void Satisfy(params Action[] actions)
	{
		((object?)null).ShouldSatisfyAllConditions(actions);
	}
}