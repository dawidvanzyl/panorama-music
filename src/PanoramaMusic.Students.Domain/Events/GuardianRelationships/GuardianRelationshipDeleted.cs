using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Events.GuardianRelationships;

public sealed record GuardianRelationshipDeleted(GuardianRelationship Relationship) : IDomainEvent;