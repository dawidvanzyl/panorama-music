using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Infrastructure.Dtos;

namespace PanoramaMusic.Reporting.Infrastructure.Extensions;

internal static class SiblingGroupDtoExtensions
{
	internal static SiblingGroupMembership ToSiblingGroupMembership(this SiblingGroupDto dto) =>
		new(dto.Student_Id, dto.Group_Key, dto.Date_Of_Birth);
}