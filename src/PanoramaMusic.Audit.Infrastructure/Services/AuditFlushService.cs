using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Interfaces;
using PanoramaMusic.Domain;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;

namespace PanoramaMusic.Audit.Infrastructure.Services;

public sealed class AuditFlushService(
	IDomainEventCollector collector,
	IEnumerable<IAuditEventTranslator> translators,
	IAuditLogger auditLogger,
	IUnitOfWork unitOfWork) : IAuditFlushService
{
	public Task FlushAsync(CancellationToken cancellationToken) =>
		ProcessAsync(collector.DrainAll(), durableOnly: false, cancellationToken);

	public Task FlushDurableAsync(CancellationToken cancellationToken) =>
		ProcessAsync(collector.DrainAll(), durableOnly: true, cancellationToken);

	private async Task ProcessAsync(IReadOnlyCollection<IDomainEvent> domainEvents, bool durableOnly, CancellationToken cancellationToken)
	{
		List<Exception>? failures = null;

		foreach (var domainEvent in domainEvents)
		{
			var translator = FindTranslator(domainEvent);
			if (translator is null || (durableOnly && translator.Lane != AuditLane.Durable))
				continue;

			try
			{
				await WriteAsync(translator, domainEvent, cancellationToken);
			}
			catch (Exception exception)
			{
				(failures ??= []).Add(exception);
			}
		}

		if (failures is { Count: > 0 })
			throw new AggregateException(failures);
	}

	private async Task WriteAsync(IAuditEventTranslator translator, IDomainEvent domainEvent, CancellationToken cancellationToken)
	{
		var auditEvent = translator.Translate(domainEvent);

		if (translator.Lane == AuditLane.Durable)
		{
			await unitOfWork.ExecuteIsolatedAsync(
				() => auditLogger.CreateAsync(auditEvent, cancellationToken),
				cancellationToken);
		}
		else
		{
			await auditLogger.CreateAsync(auditEvent, cancellationToken);
		}
	}

	private IAuditEventTranslator? FindTranslator(IDomainEvent domainEvent) =>
		translators.SingleOrDefault(translator => translator.CanTranslate(domainEvent));
}