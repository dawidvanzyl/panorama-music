using PanoramaMusic.Teachers.Application.Requests.Banking;

namespace PanoramaMusic.Teachers.Application.Commands.Banking;

public sealed record CreateBankingDetailsCommand(Guid TeacherId, CreateBankingDetailsRequest Request);