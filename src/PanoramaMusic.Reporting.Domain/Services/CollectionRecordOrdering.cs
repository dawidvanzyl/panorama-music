using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Services;

/// <summary>
/// Orders one collection's records for a student's section, per the issue's
/// "Records are ordered" rule: Guardian by guardian id ascending; Course by
/// Course Type -&gt; Lesson Type -&gt; Duration -&gt; Occurrence -&gt; Instrument Type
/// -&gt; Step Type, each in the option order of the registry contract; Extra-
/// Curricular by Activity A-&gt;Z. Uses only the order sources
/// <see cref="StudentFieldRegistry.OrderSources"/> names for the collection.
/// </summary>
public static class CollectionRecordOrdering
{
	public static IReadOnlyList<CollectionRecord> Sort(ReportCollection collection, IReadOnlyList<CollectionRecord> records) =>
		collection switch
		{
			ReportCollection.Guardian => [.. records.OrderBy(GuardianKey, StringComparer.Ordinal)],
			ReportCollection.Course => [.. records.OrderBy(CourseKey, CourseKeyComparer.Instance)],
			ReportCollection.ExtraCurricular => [.. records
				.OrderBy(record => record.Sources.GetString("activity") ?? string.Empty, StringComparer.OrdinalIgnoreCase)
				.ThenBy(record => record.Sources.GetGuid("extraCurricularId"))],
			_ => records,
		};

	private static string GuardianKey(CollectionRecord record) =>
		(record.Sources.GetGuid("guardianId") ?? Guid.Empty).ToString("D");

	private static (int CourseType, int LessonType, int Duration, int Occurrence, int InstrumentType, int StepType, Guid StudentCourseId) CourseKey(
		CollectionRecord record) => (
		Rank(StudentFieldRegistry.CourseTypeOptions, record.Sources.GetString("courseType")),
		Rank(StudentFieldRegistry.LessonTypeOptions, record.Sources.GetString("lessonType")),
		Rank(StudentFieldRegistry.DurationTypeOptions, record.Sources.GetString("durationType")),
		Rank(StudentFieldRegistry.OccurrenceTypeOptions, record.Sources.GetString("occurrenceType")),
		Rank(StudentFieldRegistry.InstrumentTypeOptions, record.Sources.GetString("instrumentType")),
		Rank(StudentFieldRegistry.StepTypeOptions, record.Sources.GetString("stepType")),
		record.Sources.GetGuid("studentCourseId") ?? Guid.Empty);

	private static int Rank(IReadOnlyList<FieldOption> options, string? value)
	{
		if (value is null)
			return int.MaxValue;

		var index = options.ToList().FindIndex(option => option.Value == value);
		return index < 0 ? int.MaxValue : index;
	}

	private sealed class CourseKeyComparer
		: IComparer<(int CourseType, int LessonType, int Duration, int Occurrence, int InstrumentType, int StepType, Guid StudentCourseId)>
	{
		public static readonly CourseKeyComparer Instance = new();

		public int Compare(
			(int CourseType, int LessonType, int Duration, int Occurrence, int InstrumentType, int StepType, Guid StudentCourseId) x,
			(int CourseType, int LessonType, int Duration, int Occurrence, int InstrumentType, int StepType, Guid StudentCourseId) y)
		{
			int result;
			if ((result = x.CourseType.CompareTo(y.CourseType)) != 0) return result;
			if ((result = x.LessonType.CompareTo(y.LessonType)) != 0) return result;
			if ((result = x.Duration.CompareTo(y.Duration)) != 0) return result;
			if ((result = x.Occurrence.CompareTo(y.Occurrence)) != 0) return result;
			if ((result = x.InstrumentType.CompareTo(y.InstrumentType)) != 0) return result;
			if ((result = x.StepType.CompareTo(y.StepType)) != 0) return result;
			return x.StudentCourseId.CompareTo(y.StudentCourseId);
		}
	}
}
