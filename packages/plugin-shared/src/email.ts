/**
 * Linear-time email format check shared by all plugins.
 *
 * Replaces backtracking patterns such as /^[^\s@]+@[^\s@]+\.[^\s@]+$/, which
 * take quadratic time on long dotted inputs. Accepts a non-empty local part,
 * exactly one "@", no whitespace, and a domain whose first dot has at least
 * one character on each side.
 */
export function isValidEmail(value: string): boolean {
  if (typeof value !== "string" || value.length < 3 || value.length > 254) {
    return false;
  }
  if (/[\u0000-\u0020\u007f]/.test(value) || /\s/.test(value)) return false;
  const at = value.indexOf("@");
  if (at < 1 || at > 64 || at !== value.lastIndexOf("@")) return false;
  const local = value.slice(0, at);
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return false;
  }
  const domain = value.slice(at + 1);
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) {
    return false;
  }
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  return labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      !label.startsWith("-") &&
      !label.endsWith("-")
  );
}
