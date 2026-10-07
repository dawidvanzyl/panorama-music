import type { GuardianRelationship, GuardianResult } from '../services/guardians';
import { EM_DASH } from './enrollment-options';

export const NO_GUARDIANS_LINKED = 'No guardians linked.';

/** A guardian's name and how they relate to the student. */
export function guardianHeading(guardian: GuardianResult, relationships: GuardianRelationship[]): string {
  const relationship =
    relationships.find((r) => r.guardianRelationshipId === guardian.guardianRelationshipId)?.name ?? EM_DASH;
  return `${guardian.firstName} ${guardian.surname} · ${relationship}`;
}

/** The flags that are set, in display order, or null when none is. */
export function guardianFlags(guardian: GuardianResult): string | null {
  const flags = [
    guardian.receivesCorrespondence ? 'Correspondence' : null,
    guardian.responsibleForPayment ? 'Payment' : null,
    guardian.married ? 'Married' : null,
  ].filter((flag) => flag !== null);
  return flags.length > 0 ? flags.join(', ') : null;
}
