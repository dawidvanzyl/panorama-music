import type { Bank, BankAccountType } from './teachers';

/**
 * How banking values are named and shown. The server holds no display text —
 * it returns enum names and audit event types — so the wording the design
 * specifies lives here, in one place, rather than being spelled out in each
 * component that renders it.
 */

export const BANK_LABELS: Record<Bank, string> = {
  StandardBank: 'Standard Bank',
  Fnb: 'FNB',
  Nedbank: 'Nedbank',
  Absa: 'Absa',
  Capitec: 'Capitec',
};

export const ACCOUNT_TYPE_LABELS: Record<BankAccountType, string> = {
  ChequeCurrent: 'Cheque/Current',
  Savings: 'Savings',
};

const ACTIVITY_LABELS: Record<string, string> = {
  'teachers.banking_details.captured': 'Banking details created',
  'teachers.banking_details.amended': 'Banking details updated',
  'teachers.banking_details.deleted': 'Banking details deleted',
  'teachers.banking_details.revealed': 'Account number revealed',
};

/**
 * The masked account number. The single definition of the masked form — it
 * takes the last four digits rather than a number, because nothing on this side
 * of the reveal action ever holds one.
 */
export function maskAccountNumber(last4: string): string {
  return `•••• •••• ${last4}`;
}

/** What the teachers list shows in the banking column. */
export function bankingColumnText(last4: string | null | undefined): string {
  return last4 ? maskAccountNumber(last4) : 'None captured';
}

/** Falls back to the raw event type so an unmapped action is still legible. */
export function activityLabel(eventType: string): string {
  return ACTIVITY_LABELS[eventType] ?? eventType;
}

export function formatActivityTimestamp(occurredAt: string): string {
  const date = new Date(occurredAt);
  const pad = (value: number): string => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
