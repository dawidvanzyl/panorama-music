using Microsoft.AspNetCore.Http;
using PanoramaMusic.Infrastructure.Contexts.Bases;
using PanoramaMusic.Reporting.Application.Interfaces;

namespace PanoramaMusic.Reporting.Infrastructure.Contexts;

public sealed class UserContext(IHttpContextAccessor accessor) : UserContextBase(accessor), IUserContext
{
}