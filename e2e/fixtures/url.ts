export function extractTokenFromUrl(url: string): string {
  const hashPart = url.split('#')[1] ?? '';
  const params = new URLSearchParams(hashPart.split('?')[1] ?? '');
  const token = params.get('token');
  if (!token) throw new Error(`No token found in URL: ${url}`);
  return token;
}
