namespace PanoramaMusic.Students.Domain.Enums;

/// <summary>
/// Which of the two student listings a student belongs to. The two are
/// complementary by construction — <see cref="WaitingList"/> is exactly the set
/// the waiting list shows (holds an entry and holds no course enrollment) and
/// <see cref="Enrolled"/> is exactly the set the roster shows — so a student is
/// never in both and never in neither.
/// <para>
/// Because the listing a student belongs to is also the screen they can be
/// reached through, this doubles as the surface a write came through. The
/// student wizard's Student, Siblings and Guardians tabs are the same screens
/// whether they were opened from the roster or from the waiting list, under
/// different permissions, and the two are otherwise indistinguishable once the
/// write lands — the audit trail carries this so a record can be traced back to
/// the screen and permission path that produced it.
/// </para>
/// </summary>
public enum StudentPopulation
{
	Enrolled,
	WaitingList,
}