namespace PanoramaMusic.Students.Domain.Enums;

/// <summary>
/// Which of the two student listings a student belongs to. The two are
/// complementary by construction — <see cref="WaitingList"/> is exactly the set
/// the waiting list shows (holds an entry and holds no course enrollment) and
/// <see cref="Enrolled"/> is exactly the set the roster shows — so a student is
/// never in both and never in neither.
/// </summary>
public enum StudentPopulation
{
	Enrolled,
	WaitingList,
}
