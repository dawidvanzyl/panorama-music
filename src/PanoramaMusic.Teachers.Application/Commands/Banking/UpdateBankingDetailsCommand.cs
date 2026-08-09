using PanoramaMusic.Teachers.Application.Requests.Banking;

namespace PanoramaMusic.Teachers.Application.Commands.Banking;

public sealed record UpdateBankingDetailsCommand(Guid TeacherId, UpdateBankingDetailsRequest Request);