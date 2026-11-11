/**
 * Linear-time email format check shared by all plugins.
 *
 * Replaces backtracking patterns such as /^[^\s@]+@[^\s@]+\.[^\s@]+$/, which
 * take quadratic time on long dotted inputs. Accepts a non-empty local part,
 * exactly one "@", no whitespace, and a domain whose first dot has at least
 * one character on each side.
 */
export function isValidEmail(value: string): boolean {
  if (/\s/.test(value)) return false;
  const at = value.indexOf("@");
  if (at < 1 || at !== value.lastIndexOf("@")) return false;
  const domain = value.slice(at + 1);
  const dot = domain.indexOf(".");
  return dot > 0 && dot < domain.length - 1;
}
