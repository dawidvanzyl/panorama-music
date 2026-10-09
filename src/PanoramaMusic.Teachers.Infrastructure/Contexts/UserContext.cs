using Microsoft.AspNetCore.Http;
using PanoramaMusic.Infrastructure.Contexts.Bases;
using PanoramaMusic.Teachers.Application.Interfaces;

namespace PanoramaMusic.Teachers.Infrastructure.Contexts;

public sealed class UserContext(IHttpContextAccessor accessor) : UserContextBase(accessor), IUserContext
{
}