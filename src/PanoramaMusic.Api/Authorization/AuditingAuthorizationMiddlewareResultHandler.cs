using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Identity.Application;
using PanoramaMusic.Identity.Application.Interfaces;

namespace PanoramaMusic.Api.Authorization;

/// <summary>
/// Wraps the default authorization result handler to emit an
/// <c>identity.authorization.denied</c> audit event whenever a policy check
/// is forbidden (authenticated but insufficient role) — a 401 challenge for
/// an unauthenticated caller is not an authorization denial and is not
/// audited here.
/// </summary>
public sealed class AuditingAuthorizationMiddlewareResultHandler : IAuthorizationMiddlewareResultHandler
{
	private readonly AuthorizationMiddlewareResultHandler _defaultHandler = new();

	public async Task HandleAsync(
		RequestDelegate next,
		HttpContext context,
		AuthorizationPolicy policy,
		PolicyAuthorizationResult authorizeResult)
	{
		if (authorizeResult.Forbidden)
		{
			var userContext = context.RequestServices.GetRequiredService<IUserContext>();
			var auditLogger = context.RequestServices.GetRequiredService<IAuditLogger>();
			var auditEventFactory = context.RequestServices.GetRequiredService<IAuditEventFactory>();

			await auditLogger.CreateAsync(
				auditEventFactory.Create(
					IdentityAuditEventTypes.AuthorizationDenied,
					userContext.UserId,
					userContext.Email,
					targetId: null,
					AuditOutcomes.Failure,
					reason: "Forbidden",
					detail: new Dictionary<string, object?>
					{
						["path"] = context.Request.Path.Value
					}),
				context.RequestAborted);
		}

		await _defaultHandler.HandleAsync(next, context, policy, authorizeResult);
	}
}