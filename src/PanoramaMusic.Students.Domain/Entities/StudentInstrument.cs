using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Domain.Entities;

/// <summary>
/// The instrument type and step recorded for one enrollment. It belongs to a
/// <see cref="StudentCourse"/> rather than to the student, so the same student
/// may hold a different instrument and step on each course they are enrolled in.
/// <para>
/// The instrument type is optional because a theory course records a step alone;
/// a course type that records neither has no <see cref="StudentInstrument"/> at
/// all.
/// </para>
/// </summary>
public sealed record StudentInstrument(InstrumentType? InstrumentType, StepType StepType);