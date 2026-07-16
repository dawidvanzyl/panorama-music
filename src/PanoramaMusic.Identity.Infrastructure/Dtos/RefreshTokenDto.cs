namespace PanoramaMusic.Identity.Infrastructure.Dtos;

internal sealed record RefreshTokenDto(
	Guid Token_Id,
	Guid User_Id,
	string Token_Hash,
	DateTime Expires_At,
	DateTime? Revoked_At,
	Guid Family_Id,
	DateTime Session_Started_At,
	string? Device_Label,
	string? Ip_Address,
	DateTime Last_Seen_At,
	Guid? Access_Token_Jti,
	DateTime? Access_Token_Expires_At);

internal sealed record SessionWithOwnerDto(
	Guid Token_Id,
	Guid User_Id,
	string User_Email,
	string User_Roles,
	DateTime Session_Started_At,
	DateTime Last_Seen_At,
	DateTime Expires_At,
	string? Device_Label,
	string? Ip_Address);