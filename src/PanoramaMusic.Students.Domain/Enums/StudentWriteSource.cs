namespace PanoramaMusic.Students.Domain.Enums;

/// <summary>
/// Which surface a write came through. The student wizard's Student, Siblings
/// and Guardians tabs are the same screens whether they were opened from the
/// roster or from the waiting list, under different permissions, and the two
/// are otherwise indistinguishable once the write lands — the audit trail
/// carries this so a record can be traced back to the screen and permission
/// path that produced it.
/// </summary>
public enum StudentWriteSource
{
	Roster,
	WaitingList,
}
