using Dapper;
using Microsoft.AspNetCore.DataProtection.Repositories;
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
public sealed class PostgresXmlRepository(IDbConnectionFactory connectionFactory) : IXmlRepository
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
	}

	private static CommandDefinition CreateCommandDefinition(string sql, object? parameters)
		=> new(sql, parameters, commandType: CommandType.StoredProcedure);
}