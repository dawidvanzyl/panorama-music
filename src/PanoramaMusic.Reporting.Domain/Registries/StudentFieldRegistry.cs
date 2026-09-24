using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Formats;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Registries;

/// <summary>
/// The code-defined allowlist of every attribute a report may filter or
/// project over the Student collection — the "Registry contract" tables in
/// the issue, verbatim. No banking attribute is ever registered here, and no
/// SQL lives here: the Infrastructure <c>StudentSqlCatalog</c> maps these same
/// keys and source names to SQL, and a startup/test parity check keeps the
/// two in lock step (317UC3).
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
				[new("Junior", "Junior"), new("Senior", "Senior")]),
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
		];

		_filtersByKey = Filters.ToDictionary(filter => filter.Key);
		_columnsByKey = Columns.ToDictionary(column => column.Key);
	}

	public IReadOnlyList<FilterAttribute> Filters { get; }

	public IReadOnlyList<ColumnAttribute> Columns { get; }

	public FilterAttribute? TryGetFilter(string key) => _filtersByKey.GetValueOrDefault(key);

	public ColumnAttribute? TryGetColumn(string key) => _columnsByKey.GetValueOrDefault(key);
}