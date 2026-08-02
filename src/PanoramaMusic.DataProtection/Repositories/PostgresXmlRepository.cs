using Dapper;
using Microsoft.AspNetCore.DataProtection.Repositories;
using Microsoft.Extensions.Logging;
using PanoramaMusic.Persistence.Factories;
using System.Data;
using System.Xml.Linq;

namespace PanoramaMusic.DataProtection.Repositories;

/// <summary>
/// Persists the Data Protection keyring to PostgreSQL. The framework constructs
/// and calls this repository from its singleton key manager, outside the HTTP
/// request pipeline, so it takes a connection from IDbConnectionFactory rather
/// than joining the request-scoped IUnitOfWork used by the bounded contexts'
/// repositories — there is no ambient transaction to enlist in, and key
/// material must persist independently of whichever request happened to
/// trigger the key generation.
/// </summary>
public sealed class PostgresXmlRepository(IDbConnectionFactory connectionFactory, ILogger<PostgresXmlRepository> logger) : IXmlRepository
{
	public IReadOnlyCollection<XElement> GetAllElements()
	{
		using var connection = connectionFactory.CreateConnection();
		var command = CreateCommandDefinition("data_protection.get_data_protection_keys", null);
		return connection.Query<string>(command).Select(XElement.Parse).ToList();
	}

	public void StoreElement(XElement element, string friendlyName)
	{
		using var connection = connectionFactory.CreateConnection();
		var command = CreateCommandDefinition(
			"data_protection.insert_data_protection_key",
			new
			{
				p_id = Guid.NewGuid(),
				p_friendly_name = friendlyName,
				p_key_xml = element.ToString(SaveOptions.DisableFormatting),
			});
		connection.Execute(command);

		// ASVS 5.0.0-16.3.3: writing key material is a state change on a security control,
		// so it must leave a trace. This is a log line rather than an audit event because
		// the framework calls StoreElement from its singleton key manager — there is no
		// scoped IUnitOfWork, no actor and no correlation id to build an AuditEvent from,
		// and key rotation is a system action rather than a user one. Only the
		// framework-generated friendly name is recorded; the element itself is key
		// material and must never be logged (ASVS 5.0.0-16.2.5).
		logger.LogInformation("Data Protection key {FriendlyName} written to the keyring.", friendlyName);
	}

	private static CommandDefinition CreateCommandDefinition(string sql, object? parameters)
		=> new(sql, parameters, commandType: CommandType.StoredProcedure);
}