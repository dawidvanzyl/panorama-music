namespace PanoramaMusic.Identity.Application;

/// <summary>
/// Audit event types emitted by the Identity context, following the
/// <c>{context}.{entity}.{action}</c> convention of the Audit Event Catalog.
/// </summary>
public static class IdentityAuditEventTypes
{
	public const string LoginSucceeded = "identity.user.login_succeeded";
	public const string LoginFailed = "identity.user.login_failed";
	public const string LoggedOut = "identity.user.logged_out";
	public const string TokenRefreshed = "identity.refresh_token.refreshed";
	public const string TokenRevoked = "identity.refresh_token.revoked";
	public const string TokenReuseDetected = "identity.refresh_token.reuse_detected";
	public const string RegistrationCompleted = "identity.user.registration_completed";
	public const string PasswordResetRequested = "identity.password_reset.requested";
	public const string PasswordResetCompleted = "identity.password_reset.completed";
	public const string UserCreated = "identity.user.created";
	public const string InviteGenerated = "identity.invite_token.generated";
	public const string InviteRegenerated = "identity.invite_token.regenerated";
	public const string InviteRevoked = "identity.invite_token.revoked";
	public const string RolesChanged = "identity.user.roles_changed";
	public const string UserActivated = "identity.user.activated";
	public const string UserDeactivated = "identity.user.deactivated";
	public const string UserDeleted = "identity.user.deleted";
	public const string AuthorizationDenied = "identity.authorization.denied";
}