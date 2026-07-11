using Microsoft.AspNetCore.Authorization;

namespace PanoramaMusic.Api.Authorization;

public static class AuthorizationMiddlewareResultHandlerServiceCollectionExtensions
{
	/// <summary>
	/// Registers <typeparamref name="THandler"/> as the singleton
	/// <see cref="IAuthorizationMiddlewareResultHandler"/>, mirroring the ergonomics
	/// of the built-in <c>AddExceptionHandler&lt;T&gt;()</c>.
	/// </summary>
	public static IServiceCollection AddAuthorizationResultHandler<THandler>(this IServiceCollection services)
		where THandler : class, IAuthorizationMiddlewareResultHandler
	{
		services.AddSingleton<IAuthorizationMiddlewareResultHandler, THandler>();
		return services;
	}
}