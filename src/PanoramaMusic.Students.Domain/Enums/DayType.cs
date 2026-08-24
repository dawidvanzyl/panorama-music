namespace PanoramaMusic.Students.Domain.Enums;

/// <summary>
/// A day of the school week. The member order is the display order an
/// extra-curricular activity's practice times are held in — Monday first — so
/// sorting by the enum value is what "day-then-time order" means.
/// </summary>
public enum DayType
{
	Monday,
	Tuesday,
	Wednesday,
	Thursday,
	Friday,
	Saturday,
	Sunday
}