/** Lightweight privacy mask for OTP UI (not security). */
export function maskEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf('@');
  if (at <= 0) {
    return '***';
  }
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1) || 'email';
  if (local.length <= 2) {
    return `${local[0] ?? '*'}***@${domain}`;
  }
  return `${local.slice(0, 2)}***@${domain}`;
}
