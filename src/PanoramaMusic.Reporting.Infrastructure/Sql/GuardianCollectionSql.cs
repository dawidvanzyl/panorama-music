namespace PanoramaMusic.Reporting.Infrastructure.Sql;

/// <summary>
/// The Guardian collection's fixed, set-based query: every source the
/// Guardian columns need, for the whole population in one call. The only
/// addition <see cref="Compose"/> makes is a registry-composed record
/// condition whose values are bound.
/// </summary>
internal static class GuardianCollectionSql
{
	public const string Query = """
		SELECT sg.student_id, g.guardian_id, g.first_name, g.surname, gr.name AS relationship, g.cell, g.email,
		       g.receives_correspondence, g.responsible_for_payment, g.married
		FROM students.student_guardians sg
		JOIN students.guardians g ON g.guardian_id = sg.guardian_id
		JOIN students.guardian_relationships gr ON gr.guardian_relationship_id = g.guardian_relationship_id
		WHERE sg.student_id = ANY(@studentIds)
		""";

	public static string Compose(string? recordCondition) =>
		recordCondition is null ? Query : $"{Query} AND {recordCondition}";

	/// <summary>SQL column alias -> the logical source name it resolves to.</summary>
	public static readonly IReadOnlyDictionary<string, string> Sources = new Dictionary<string, string>
	{
		["guardian_id"] = "guardianId",
		["first_name"] = "firstName",
		["surname"] = "surname",
		["relationship"] = "relationship",
		["cell"] = "cell",
		["email"] = "email",
		["receives_correspondence"] = "receivesCorrespondence",
		["responsible_for_payment"] = "responsibleForPayment",
		["married"] = "married",
	};
}