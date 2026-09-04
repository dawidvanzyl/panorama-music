namespace PanoramaMusic.Students.Domain.Enums;

/// <summary>
/// Which surface a write to a student's own record came through. A student is
/// reachable from the roster and from the waiting list, under different
/// permissions, and the two are otherwise indistinguishable once the write
/// lands — the audit trail carries this so a record can be traced back to the
/// screen and permission path that produced it.
/// </summary>
public enum StudentWriteSource
{
	Roster,
	WaitingList,
}
