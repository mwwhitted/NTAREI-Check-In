// Deliberately simple: something@something.something, no whitespace.
// Not a deliverability check — just catches obvious typos.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value).trim());
}
