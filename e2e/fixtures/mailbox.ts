const SMTP4DEV_BASE_URL = 'http://localhost:5000';

interface Smtp4devMessageSummary {
  id: string;
  to: string[];
  subject: string;
}

interface Smtp4devMessagesResponse {
  results: Smtp4devMessageSummary[];
  currentPage: number;
  pageCount: number;
}

async function findMessage(recipient: string, subject: string): Promise<Smtp4devMessageSummary | undefined> {
  let page = 1;
  let pageCount = 1;

  do {
    const response = await fetch(
      `${SMTP4DEV_BASE_URL}/api/Messages?pageSize=100&page=${page}&sortColumn=receivedDate&sortIsDescending=true`,
    );
    const data = (await response.json()) as Smtp4devMessagesResponse;
    pageCount = data.pageCount;

    const match = data.results.find(
      (message) => message.subject === subject && message.to.some((to) => to.toLowerCase() === recipient.toLowerCase()),
    );
    if (match) return match;

    page += 1;
  } while (page <= pageCount);

  return undefined;
}

export async function waitForPasswordResetLink(recipient: string, timeoutMs = 15000): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const message = await findMessage(recipient, 'Reset your Panorama Music password');
    if (message) {
      const html = await (await fetch(`${SMTP4DEV_BASE_URL}/api/Messages/${message.id}/html`)).text();
      const match = /href="(http[^"]*\/#\/reset-password\?token=[^"]+)"/.exec(html);
      if (match) return match[1];
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for a password-reset email to ${recipient}`);
}
