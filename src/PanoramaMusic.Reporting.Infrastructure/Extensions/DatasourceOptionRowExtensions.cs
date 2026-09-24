using PanoramaMusic.Reporting.Domain.Formats;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Infrastructure.Extensions;

internal sealed record GuardianRelationshipOptionRow(Guid GuardianRelationshipId, string Name);

internal sealed record TeacherNameOptionRow(Guid TeacherId, string FirstName, string Surname, bool IsActive);

internal sealed record ExtraCurricularOptionRow(Guid ExtraCurricularId, string Description, string Phase);

internal static class DatasourceOptionRowExtensions
{
	public static FieldOption ToFieldOption(this GuardianRelationshipOptionRow row) =>
		new(row.GuardianRelationshipId.ToString(), row.Name);

	public static FieldOption ToFieldOption(this TeacherNameOptionRow row) =>
		new(row.TeacherId.ToString(), TeacherLabel.Compose(row.FirstName, row.Surname, row.IsActive));

	public static FieldOption ToFieldOption(this ExtraCurricularOptionRow row) =>
		new(row.ExtraCurricularId.ToString(), ActivityOptionLabel.Compose(row.Description, row.Phase));
}
