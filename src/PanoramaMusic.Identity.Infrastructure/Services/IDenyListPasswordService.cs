namespace PanoramaMusic.Identity.Infrastructure.Services;

public interface IDenyListPasswordService
{
	bool Validate(string password);
}