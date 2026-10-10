using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Teachers.Application.Handlers.Banking;
using PanoramaMusic.Teachers.Application.Handlers.Self;
using PanoramaMusic.Teachers.Application.Handlers.Teachers;
using PanoramaMusic.Teachers.Application.Services;
using PanoramaMusic.Teachers.Application.Validators.Teachers;
using PanoramaMusic.Teachers.Domain.Services;

namespace PanoramaMusic.Teachers.Application.Extensions;

public static class ServiceCollectionExtensions
{
	public static IServiceCollection AddTeachersApplication(this IServiceCollection services)
	{
		AddTeachers(services);
		AddBanking(services);
		AddSelf(services);
		AddServices(services);

		services.AddValidatorsFromAssemblyContaining<CreateTeacherRequestValidator>();

		return services;
	}

	private static void AddTeachers(IServiceCollection services)
	{
		services.AddTransient<CreateTeacherHandler>();
		services.AddTransient<GetTeacherByIdHandler>();
		services.AddTransient<GetTeachersHandler>();
		services.AddTransient<GetTeacherRosterHandler>();
		services.AddTransient<UpdateTeacherProfileHandler>();
		services.AddTransient<UpdateTeacherClassificationHandler>();
		services.AddTransient<GetLinkableAccountsHandler>();
		services.AddTransient<LinkTeacherAccountHandler>();
		services.AddTransient<UnlinkTeacherAccountHandler>();
		services.AddTransient<DeactivateTeacherHandler>();
		services.AddTransient<ReactivateTeacherHandler>();
		services.AddTransient<DeleteTeacherHandler>();
	}

	private static void AddBanking(IServiceCollection services)
	{
		services.AddTransient<CreateBankingDetailsHandler>();
		services.AddTransient<UpdateBankingDetailsHandler>();
		services.AddTransient<DeleteBankingDetailsHandler>();
		services.AddTransient<RevealAccountNumberHandler>();
		services.AddTransient<GetBankingActivityHandler>();
	}

	private static void AddSelf(IServiceCollection services)
	{
		services.AddTransient<GetOwnTeacherHandler>();
		services.AddTransient<UpdateOwnTeacherProfileHandler>();
		services.AddTransient<CreateOwnBankingDetailsHandler>();
		services.AddTransient<UpdateOwnBankingDetailsHandler>();
		services.AddTransient<DeleteOwnBankingDetailsHandler>();
		services.AddTransient<RevealOwnAccountNumberHandler>();
		services.AddTransient<GetOwnBankingActivityHandler>();
	}

	private static void AddServices(IServiceCollection services)
	{
		services.AddTransient<TeacherAccountLinkService>();
		services.AddTransient<TeacherResultComposer>();
		services.AddTransient<OwnTeacherResolver>();
	}
}