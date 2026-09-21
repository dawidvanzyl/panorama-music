using PanoramaMusic.Reporting.Application.Extensions;
using PanoramaMusic.Reporting.Application.Models;
using PanoramaMusic.Reporting.Domain.Registries;

namespace PanoramaMusic.Reporting.Application.Handlers;

/// <summary>
/// Takes no <see cref="CancellationToken"/>: the registry is an in-memory,
/// code-defined allowlist, so there is no I/O to cancel.
/// </summary>
public sealed class GetReportFieldsHandler(StudentFieldRegistry registry)
{
	public ReportFieldsResult Handle() => registry.ToResult();
}