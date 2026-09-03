using PanoramaMusic.Students.Application.Requests.WaitingList;

namespace PanoramaMusic.Students.Application.Commands.WaitingList;

public sealed record UpdateWaitingListEntryCommand(Guid WaitingListEntryId, UpdateWaitingListEntryRequest Request);
