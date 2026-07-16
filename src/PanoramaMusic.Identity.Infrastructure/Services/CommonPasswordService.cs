using PanoramaMusic.Identity.Application.Interfaces;

namespace PanoramaMusic.Identity.Infrastructure.Services;

/// <summary>
/// Orchestrates the common/breached-password checks: a static deny-list lookup, then (only if
/// that passes) a live HIBP check. The deny-list short-circuits first since it's instant and
/// has no network cost.
/// </summary>
public sealed class CommonPasswordService(
	IDenyListPasswordService denyListPasswordService,
	IHibpPasswordService hibpPasswordService) : ICommonPasswordService
{
	public async Task<bool> ValidateAsync(string password, CancellationToken cancellationToken)
	{
		return denyListPasswordService.Validate(password)
			&& await hibpPasswordService.ValidateAsync(password, cancellationToken);
	}
}