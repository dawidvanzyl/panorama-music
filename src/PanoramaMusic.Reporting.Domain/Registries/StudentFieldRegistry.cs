using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Formats;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Registries;

/// <summary>
/// The code-defined allowlist of every attribute a report may filter or
/// project over the Student, Guardian, Course and Extra-Curricular
/// collections — the "Registry contract" tables in the issue, verbatim. No
/// banking attribute is ever registered here, and no SQL lives here: the
/// Infrastructure catalog and collection-SQL classes map these same keys and
/// source names to SQL, and a startup/test parity check keeps them in lock
/// step.
/// <para>
/// This is a singleton value the DI container hands out — it has no mutable
/// state and is safe to share across requests.
/// </para>
/// </summary>
public sealed class StudentFieldRegistry
{
	private static readonly FieldOption[] _yesNoOptions =
	[
		new("Yes", "Yes"),
		new("No", "No"),
	];

	private static readonly FieldOption[] _phaseOptions =
	[
		new("Junior", "Junior"),
		new("Senior", "Senior"),
	];

	public static readonly IReadOnlyList<FieldOption> CourseTypeOptions =
	[
		new("Theory", "Theory"),
		new("GREEnrichment", "GR Enrichment"),
		new("G1Enrichment", "Grade 1 Enrichment"),
		new("G2Recorder", "Grade 2 Recorder"),
		new("Instrument", "Instrument"),
	];

	public static readonly IReadOnlyList<FieldOption> LessonTypeOptions =
	[
		new("Individual", "Individual"),
		new("Group", "Group"),
	];

	public static readonly IReadOnlyList<FieldOption> DurationTypeOptions =
	[
		new("Hour", "Hour"),
		new("HalfHour", "Half Hour"),
	];

	public static readonly IReadOnlyList<FieldOption> OccurrenceTypeOptions =
	[
		new("DuringSchool", "During School"),
		new("AfterSchool", "After School"),
	];

	public static readonly IReadOnlyList<FieldOption> InstrumentTypeOptions =
	[
		new("Piano", "Piano"),
		new("Guitar", "Guitar"),
		new("Recorder", "Recorder"),
		new("Keyboard", "Keyboard"),
		new("Voice", "Voice"),
		new("Other", "Other"),
	];

	public static readonly IReadOnlyList<FieldOption> StepTypeOptions =
	[
		new("Step1A", "1A"),
		new("Step1B", "1B"),
		new("Step2A", "2A"),
		new("Step2B", "2B"),
		new("Step3A", "3A"),
		new("Step3B", "3B"),
		new("Step4A", "4A"),
		new("Step4B", "4B"),
		new("Other", "Other"),
	];

	private readonly IReadOnlyDictionary<string, FilterAttribute> _filtersByKey;
	private readonly IReadOnlyDictionary<string, ColumnAttribute> _columnsByKey;

	public StudentFieldRegistry()
	{
		Filters =
		[
			new FilterAttribute(
				"student.name",
				"Name",
				ReportCollection.Student,
				FieldDataType.Text,
				[FilterOperator.Equals, FilterOperator.Contains],
				[]),
			new FilterAttribute(
				"student.grade",
				"Grade",
				ReportCollection.Student,
				FieldDataType.List,
				[FilterOperator.Equals, FilterOperator.In],
				[
					new("Grade1", "Grade 1"),
					new("Grade2", "Grade 2"),
					new("Grade3", "Grade 3"),
					new("Grade4", "Grade 4"),
					new("Grade5", "Grade 5"),
					new("Grade6", "Grade 6"),
					new("Grade7", "Grade 7"),
					new("Private", "Private"),
				]),
			new FilterAttribute(
				"student.phase",
				"Phase",
				ReportCollection.Student,
				FieldDataType.List,
				[FilterOperator.Equals, FilterOperator.In],
				_phaseOptions),
			new FilterAttribute(
				"student.class",
				"Class",
				ReportCollection.Student,
				FieldDataType.List,
				[FilterOperator.Equals, FilterOperator.In],
				[
					new("A1", "A1"),
					new("A2", "A2"),
					new("E1", "E1"),
					new("E2", "E2"),
					new("E3", "E3"),
					new("E4", "E4"),
				]),
			new FilterAttribute(
				"student.language",
				"Language",
				ReportCollection.Student,
				FieldDataType.List,
				[FilterOperator.Equals, FilterOperator.In],
				[new("Afrikaans", "Afrikaans"), new("English", "English")]),
			new FilterAttribute(
				"student.hasSiblings",
				"Has Sibling",
				ReportCollection.Student,
				FieldDataType.Boolean,
				[FilterOperator.Equals],
				_yesNoOptions),
			new FilterAttribute(
				"student.isEldest",
				"Eldest",
				ReportCollection.Student,
				FieldDataType.Boolean,
				[FilterOperator.Equals],
				_yesNoOptions),

			new FilterAttribute(
				"guardian.name",
				"Name",
				ReportCollection.Guardian,
				FieldDataType.Text,
				[FilterOperator.Equals, FilterOperator.Contains],
				[]),
			new FilterAttribute(
				"guardian.relationship",
				"Relationship",
				ReportCollection.Guardian,
				FieldDataType.Datasource,
				[FilterOperator.Equals, FilterOperator.In],
				[],
				ReportDatasource.GuardianRelationship),
			new FilterAttribute(
				"guardian.receivesCorrespondence",
				"Receives Correspondence",
				ReportCollection.Guardian,
				FieldDataType.Boolean,
				[FilterOperator.Equals],
				_yesNoOptions),
			new FilterAttribute(
				"guardian.responsibleForPayment",
				"Responsible For Payment",
				ReportCollection.Guardian,
				FieldDataType.Boolean,
				[FilterOperator.Equals],
				_yesNoOptions),
			new FilterAttribute(
				"guardian.married",
				"Married",
				ReportCollection.Guardian,
				FieldDataType.Boolean,
				[FilterOperator.Equals],
				_yesNoOptions),

			new FilterAttribute(
				"course.courseType",
				"Course Type",
				ReportCollection.Course,
				FieldDataType.List,
				[FilterOperator.Equals, FilterOperator.In],
				CourseTypeOptions),
			new FilterAttribute(
				"course.lessonType",
				"Lesson Type",
				ReportCollection.Course,
				FieldDataType.List,
				[FilterOperator.Equals, FilterOperator.In],
				LessonTypeOptions),
			new FilterAttribute(
				"course.durationType",
				"Duration",
				ReportCollection.Course,
				FieldDataType.List,
				[FilterOperator.Equals, FilterOperator.In],
				DurationTypeOptions),
			new FilterAttribute(
				"course.occurrenceType",
				"Occurrence",
				ReportCollection.Course,
				FieldDataType.List,
				[FilterOperator.Equals, FilterOperator.In],
				OccurrenceTypeOptions),
			new FilterAttribute(
				"course.instrumentType",
				"Instrument Type",
				ReportCollection.Course,
				FieldDataType.List,
				[FilterOperator.Equals, FilterOperator.In],
				InstrumentTypeOptions),
			new FilterAttribute(
				"course.stepType",
				"Step Type",
				ReportCollection.Course,
				FieldDataType.List,
				[FilterOperator.Equals, FilterOperator.In],
				StepTypeOptions),
			new FilterAttribute(
				"course.teacher",
				"Teacher",
				ReportCollection.Course,
				FieldDataType.Datasource,
				[FilterOperator.Equals, FilterOperator.In],
				[],
				ReportDatasource.Teacher),

			new FilterAttribute(
				"extraCurricular.activity",
				"Activity",
				ReportCollection.ExtraCurricular,
				FieldDataType.Datasource,
				[FilterOperator.Equals, FilterOperator.In],
				[],
				ReportDatasource.ExtraCurricular),
			new FilterAttribute(
				"extraCurricular.phase",
				"Phase",
				ReportCollection.ExtraCurricular,
				FieldDataType.List,
				[FilterOperator.Equals, FilterOperator.In],
				_phaseOptions),
		];

		Columns =
		[
			new ColumnAttribute(
				"student.name",
				"Student",
				ReportCollection.Student,
				ColumnKind.Composite,
				1,
				null,
				locked: true,
				["firstName", "lastName"],
				new JoinFormat(" ", "firstName", "lastName")),
			new ColumnAttribute(
				"student.class",
				"Class",
				ReportCollection.Student,
				ColumnKind.Composite,
				2,
				"student.name",
				locked: false,
				["grade", "class"],
				new ClassFormat("grade", "class")),
			new ColumnAttribute(
				"student.phase",
				"Phase",
				ReportCollection.Student,
				ColumnKind.Plain,
				3,
				"student.name",
				locked: false,
				["grade", "phase"],
				new PhaseFormat("grade", "phase")),
			new ColumnAttribute(
				"student.language",
				"Language",
				ReportCollection.Student,
				ColumnKind.Plain,
				4,
				"student.name",
				locked: false,
				["language"],
				new TextFormat("language")),
			new ColumnAttribute(
				"student.dateOfBirth",
				"Date Of Birth",
				ReportCollection.Student,
				ColumnKind.Plain,
				5,
				"student.name",
				locked: false,
				["dateOfBirth"],
				new DateFormat("dateOfBirth")),
			new ColumnAttribute(
				"student.hasSiblings",
				"Has Sibling",
				ReportCollection.Student,
				ColumnKind.Scalar,
				6,
				"student.name",
				locked: false,
				["siblingCount"],
				new CountPositiveFormat("siblingCount")),
			new ColumnAttribute(
				"student.numberOfSiblings",
				"Number Of Siblings",
				ReportCollection.Student,
				ColumnKind.Scalar,
				7,
				"student.name",
				locked: false,
				["siblingCount"],
				new CountFormat("siblingCount")),
			new ColumnAttribute(
				"student.isEldest",
				"Eldest",
				ReportCollection.Student,
				ColumnKind.Scalar,
				8,
				"student.name",
				locked: false,
				["isEldest"],
				new YesNoFormat("isEldest")),

			new ColumnAttribute(
				"guardian.name",
				"Guardian",
				ReportCollection.Guardian,
				ColumnKind.Composite,
				1,
				"student.name",
				locked: false,
				["firstName", "surname", "relationship"],
				new GuardianNameFormat("firstName", "surname", "relationship")),
			new ColumnAttribute(
				"guardian.cell",
				"Cell",
				ReportCollection.Guardian,
				ColumnKind.Plain,
				2,
				"guardian.name",
				locked: false,
				["cell"],
				new TextFormat("cell")),
			new ColumnAttribute(
				"guardian.email",
				"Email",
				ReportCollection.Guardian,
				ColumnKind.Plain,
				3,
				"guardian.name",
				locked: false,
				["email"],
				new TextFormat("email")),
			new ColumnAttribute(
				"guardian.receivesCorrespondence",
				"Receives Correspondence",
				ReportCollection.Guardian,
				ColumnKind.Plain,
				4,
				"guardian.name",
				locked: false,
				["receivesCorrespondence"],
				new YesNoFormat("receivesCorrespondence")),
			new ColumnAttribute(
				"guardian.responsibleForPayment",
				"Responsible For Payment",
				ReportCollection.Guardian,
				ColumnKind.Plain,
				5,
				"guardian.name",
				locked: false,
				["responsibleForPayment"],
				new YesNoFormat("responsibleForPayment")),
			new ColumnAttribute(
				"guardian.married",
				"Married",
				ReportCollection.Guardian,
				ColumnKind.Plain,
				6,
				"guardian.name",
				locked: false,
				["married"],
				new YesNoFormat("married")),

			new ColumnAttribute(
				"course.courseType",
				"Course Type",
				ReportCollection.Course,
				ColumnKind.Composite,
				1,
				"student.name",
				locked: false,
				["courseType"],
				new OptionLabelFormat("courseType", CourseTypeOptions)),
			new ColumnAttribute(
				"course.lessonType",
				"Lesson Type",
				ReportCollection.Course,
				ColumnKind.Composite,
				2,
				"student.name",
				locked: false,
				["lessonType"],
				new OptionLabelFormat("lessonType", LessonTypeOptions)),
			new ColumnAttribute(
				"course.durationType",
				"Duration",
				ReportCollection.Course,
				ColumnKind.Composite,
				3,
				"student.name",
				locked: false,
				["durationType"],
				new OptionLabelFormat("durationType", DurationTypeOptions)),
			new ColumnAttribute(
				"course.occurrenceType",
				"Occurrence",
				ReportCollection.Course,
				ColumnKind.Composite,
				4,
				"student.name",
				locked: false,
				["occurrenceType"],
				new OptionLabelFormat("occurrenceType", OccurrenceTypeOptions)),
			new ColumnAttribute(
				"course.teacher",
				"Teacher",
				ReportCollection.Course,
				ColumnKind.Composite,
				5,
				"student.name",
				locked: false,
				["teacherFirstName", "teacherSurname", "teacherIsActive", "teacherExists"],
				new TeacherFormat("teacherFirstName", "teacherSurname", "teacherIsActive", "teacherExists")),
			new ColumnAttribute(
				"course.instrumentType",
				"Instrument Type",
				ReportCollection.Course,
				ColumnKind.Plain,
				6,
				"student.name",
				locked: false,
				["courseType", "instrumentType"],
				new InstrumentTypeFormat("courseType", "instrumentType")),
			new ColumnAttribute(
				"course.stepType",
				"Step Type",
				ReportCollection.Course,
				ColumnKind.Plain,
				7,
				"student.name",
				locked: false,
				["courseType", "stepType"],
				new StepTypeFormat("courseType", "stepType")),

			new ColumnAttribute(
				"extraCurricular.activity",
				"Activity",
				ReportCollection.ExtraCurricular,
				ColumnKind.Plain,
				1,
				"student.name",
				locked: false,
				["activity"],
				new TextFormat("activity")),
			new ColumnAttribute(
				"extraCurricular.phase",
				"Phase",
				ReportCollection.ExtraCurricular,
				ColumnKind.Plain,
				2,
				"extraCurricular.activity",
				locked: false,
				["phase"],
				new TextFormat("phase")),
			new ColumnAttribute(
				"extraCurricular.practiceTimes",
				"Practice Times",
				ReportCollection.ExtraCurricular,
				ColumnKind.Aggregate,
				3,
				"extraCurricular.activity",
				locked: false,
				["practiceDays", "practiceStartTimes"],
				new PracticeTimesFormat("practiceDays", "practiceStartTimes")),
		];

		_filtersByKey = Filters.ToDictionary(filter => filter.Key);
		_columnsByKey = Columns.ToDictionary(column => column.Key);
	}

	public IReadOnlyList<FilterAttribute> Filters { get; }

	public IReadOnlyList<ColumnAttribute> Columns { get; }

	public FilterAttribute? TryGetFilter(string key) => _filtersByKey.GetValueOrDefault(key);

	public ColumnAttribute? TryGetColumn(string key) => _columnsByKey.GetValueOrDefault(key);

	/// <summary>The source names a non-Student collection's records are ordered by; readers always return them.</summary>
	public static IReadOnlyList<string> OrderSources(ReportCollection collection) => collection switch
	{
		ReportCollection.Guardian => ["guardianId"],
		ReportCollection.Course =>
			["courseType", "lessonType", "durationType", "occurrenceType", "instrumentType", "stepType", "studentCourseId"],
		ReportCollection.ExtraCurricular => ["activity", "extraCurricularId"],
		_ => [],
	};
}
