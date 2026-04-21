const BACKUP_SUFFIX = "::backup";

const backupKey = (key: string) => `${key}${BACKUP_SUFFIX}`;

const parseJson = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const readJsonWithBackup = <T>(
  key: string,
  isValid: (value: unknown) => value is T,
  fallback: T
): T => {
  if (typeof window === "undefined") return fallback;

  const primary = parseJson<unknown>(window.localStorage.getItem(key));
  if (isValid(primary)) return primary;

  const backup = parseJson<unknown>(window.localStorage.getItem(backupKey(key)));
  if (isValid(backup)) {
    try {
      window.localStorage.setItem(key, JSON.stringify(backup));
    } catch {
      // Ignore restore write failures.
    }
    return backup;
  }

  return fallback;
};

export const writeJsonWithBackup = <T>(key: string, value: T) => {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(value);
  window.localStorage.setItem(key, raw);
  window.localStorage.setItem(backupKey(key), raw);
};
