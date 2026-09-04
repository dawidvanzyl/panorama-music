using Moq;
using PanoramaMusic.Students.Application.Services;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

/// <summary>
/// The Student, Siblings and Guardians tabs call one set of endpoints in both
/// modes, so the record being written is what says which surface reached it.
/// These pin that rule on its own, apart from any handler that asks it.
/// </summary>
public class StudentWriteSourceResolverTests
{
	private readonly Mock<IWaitingListRepository> _waitingListRepository = new();
	private readonly Mock<IStudentGuardianRepository> _studentGuardianRepository = new();
	private readonly StudentWriteSourceResolver _resolver;

	public StudentWriteSourceResolverTests()
	{
		_resolver = new StudentWriteSourceResolver(_waitingListRepository.Object, _studentGuardianRepository.Object);
	}

	[Fact]
	[Trait("AC", "300UC16")]
	public async Task ForStudentAsync_AWaitingListStudent_IsTheWaitingList()
	{
		var studentId = Guid.NewGuid();
		// The single-entry read this asks resolves the narrower set — holds an
		// entry and holds no enrollment — so a student carrying a stale entry
		// alongside an enrollment comes back as no entry at all.
		_waitingListRepository
			.Setup(r => r.GetByStudentIdAsync(studentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(WaitingListEntryFactory.Create(student: StudentFactory.Create(studentId: studentId)));

		var source = await _resolver.ForStudentAsync(studentId, TestContext.Current.CancellationToken);

		source.ShouldBe(StudentWriteSource.WaitingList);
	}

	[Fact]
	[Trait("AC", "300UC14")]
	public async Task ForStudentAsync_AStudentTheWaitingListDoesNotHold_IsTheRoster()
	{
		var studentId = Guid.NewGuid();
		_waitingListRepository
			.Setup(r => r.GetByStudentIdAsync(studentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((WaitingListEntry?)null);

		var source = await _resolver.ForStudentAsync(studentId, TestContext.Current.CancellationToken);

		source.ShouldBe(StudentWriteSource.Roster);
	}

	[Fact]
	[Trait("AC", "300UC17")]
	public async Task ForGuardianAsync_AGuardianEveryWaitingListStudentHolds_IsTheWaitingList()
	{
		var guardianId = Guid.NewGuid();
		_studentGuardianRepository
			.Setup(r => r.BelongsToWaitingListOnlyAsync(guardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);

		var source = await _resolver.ForGuardianAsync(guardianId, TestContext.Current.CancellationToken);

		source.ShouldBe(StudentWriteSource.WaitingList);
	}

	[Fact]
	[Trait("AC", "300UC14")]
	public async Task ForGuardianAsync_AGuardianAnyRosterStudentHolds_IsTheRoster()
	{
		var guardianId = Guid.NewGuid();
		// A guardian is one row shared across a sibling group, so a single
		// roster student holding it makes the whole row the roster's — which is
		// why this is not answered by "has no enrolled link": a roster student
		// who is not enrolled yet has none either.
		_studentGuardianRepository
			.Setup(r => r.BelongsToWaitingListOnlyAsync(guardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(false);

		var source = await _resolver.ForGuardianAsync(guardianId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => source.ShouldBe(StudentWriteSource.Roster),
			() => _studentGuardianRepository.Verify(
				r => r.HasEnrolledLinkAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never));
	}
}