using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Domain.ValueObjects;

/// <summary>
/// A student who may be linked as someone's sibling, carrying which listing they
/// belong to. Sibling relationships are family facts and do not depend on either
/// child's enrolment, so candidacy spans both populations — but the two differ in
/// consequence, and the state travels with the candidate so the reader is told
/// which kind of sibling they are linking.
/// </summary>
public sealed record SiblingCandidate(Student Student, StudentPopulation Population);
