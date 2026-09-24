using PanoramaMusic.Reporting.Domain.Formats;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Infrastructure.Extensions;

/// <summary>
/// Maps a dynamic datasource-option row to a <see cref="FieldOption"/>. Reads
/// by column name rather than binding to a typed record, since Dapper's
/// constructor-based materialization needs verbatim snake_case parameter
/// names to match a function's own output columns.
/// </summary>
internal static class DatasourceOptionRowExtensions
{
	public static FieldOption ToGuardianRelationshipOption(this IDictionary<string, object> row) =>
		new(((Guid)row["guardian_relationship_id"]).ToString(), (string)row["name"]);

	public static FieldOption ToTeacherOption(this IDictionary<string, object> row) =>
		new(
			((Guid)row["teacher_id"]).ToString(),
			TeacherLabel.Compose((string)row["first_name"], (string)row["surname"], (bool)row["is_active"]));

	public static Guid ExtraCurricularId(this IDictionary<string, object> row) => (Guid)row["extra_curricular_id"];

	public static FieldOption ToExtraCurricularOption(this IDictionary<string, object> row) =>
		new(row.ExtraCurricularId().ToString(), ActivityOptionLabel.Compose((string)row["description"], (string)row["phase"]));
}
