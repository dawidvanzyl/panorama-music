using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.ValueObjects;

namespace PanoramaMusic.Teachers.Application.Extensions;

public static class LinkableAccountExtensions
{
	public static LinkableAccountResult ToResult(this LinkableAccount account) =>
		new(account.AccountId, account.Email);
}