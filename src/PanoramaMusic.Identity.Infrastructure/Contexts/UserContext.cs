using Microsoft.AspNetCore.Http;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Infrastructure.Contexts.Bases;

namespace PanoramaMusic.Identity.Infrastructure.Contexts;

public sealed class UserContext(IHttpContextAccessor accessor) : UserContextBase(accessor), IUserContext
{
}