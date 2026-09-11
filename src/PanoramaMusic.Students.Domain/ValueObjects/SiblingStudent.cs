using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Domain.ValueObjects;

/// <summary>
/// A student as the Siblings tab shows them — one of the candidates on offer, or
/// one already linked — carrying which listing they belong to. Sibling
/// relationships are family facts and do not depend on either child's enrolment,
/// so both lists span both populations; the two differ in consequence, and the
/// state travels with the student so a reader can tell which kind of sibling
/// they are looking at.
/// </summary>
public sealed record SiblingStudent(Student Student, StudentPopulation Population);