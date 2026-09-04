using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Infrastructure.Translators.Students;

/// <summary>
/// Writes the surface a student write came through onto an audit event's
/// detail. The value is carried by the domain event, set by the handler that
/// raised it — nothing here works out where the write came from.
/// </summary>
internal static class StudentWriteSourceDetail
{
	private const string _sourceKey = "source";
	private const string _waitingListSource = "waitingList";

	/// <summary>
	/// The roster is where a student record lives, so a roster write records no
	/// source at all and only the other surfaces name themselves.
	/// </summary>
	public static void Apply(Dictionary<string, object?> detail, StudentWriteSource source)
	{
		if (source != StudentWriteSource.WaitingList)
			return;

		detail[_sourceKey] = _waitingListSource;
	}
}
