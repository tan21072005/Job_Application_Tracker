export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

export function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 1: case 3: case 5: case 7: case 8: case 10: case 12:
      return 31;
    case 4: case 6: case 9: case 11:
      return 30;
    case 2:
      return isLeapYear(year) ? 29 : 28;
    default:
      return 0;
  }
}

/**
 * Strict calendar date check (YYYY-MM-DD).
 * Rejects non-existent dates like 2026-02-30 or 2026-02-29 without relying on Date.parse auto-roll.
 */
export function isValidCalendarDate(dateStr: string): boolean {
  if (typeof dateStr !== 'string') return false;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  const maxDays = daysInMonth(year, month);
  if (day < 1 || day > maxDays) return false;

  return true;
}

/**
 * Strict ISO 8601 / RFC 3339 instant parser.
 * Requires date + 'T' + time + optional fractional seconds + timezone (Z or +/-HH:MM).
 * Validates underlying calendar date and time units strictly.
 */
export function isValidIsoInstant(instantStr: string): boolean {
  if (typeof instantStr !== 'string') return false;
  const match = instantStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/);
  if (!match) return false;

  const datePart = `${match[1]}-${match[2]}-${match[3]}`;
  if (!isValidCalendarDate(datePart)) return false;

  const hours = parseInt(match[4], 10);
  const minutes = parseInt(match[5], 10);
  const seconds = parseInt(match[6], 10);

  if (hours < 0 || hours > 23) return false;
  if (minutes < 0 || minutes > 59) return false;
  if (seconds < 0 || seconds > 59) return false;

  const tzPart = match[7];
  if (tzPart !== 'Z') {
    const tzMatch = tzPart.match(/^([+-])(\d{2}):(\d{2})$/);
    if (!tzMatch) return false;
    const tzHours = parseInt(tzMatch[2], 10);
    const tzMinutes = parseInt(tzMatch[3], 10);
    if (tzHours > 14 || (tzHours === 14 && tzMinutes > 0) || tzMinutes > 59) return false;
  }

  const timestamp = Date.parse(instantStr);
  return Number.isFinite(timestamp);
}

/**
 * Strict IANA named timezone validator.
 * Accepts IANA zones (e.g. 'Asia/Ho_Chi_Minh', 'America/New_York') and 'UTC' / 'Etc/UTC'.
 * Explicitly rejects raw offset strings (e.g. '+07:00', '-05:00', 'GMT+7').
 */
export function isValidIanaTimezone(tz: string): boolean {
  if (typeof tz !== 'string' || !tz.trim()) return false;
  const trimmed = tz.trim();

  // Reject raw numerical offset representations
  if (/^[+-]\d{2}(?::?\d{2})?$/.test(trimmed)) return false;
  if (/^GMT[+-]\d{1,2}(?::?\d{2})?$/i.test(trimmed)) return false;
  if (/^UTC[+-]\d{1,2}(?::?\d{2})?$/i.test(trimmed)) return false;

  try {
    new Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve local datetime string into UTC ISO instants, properly handling DST gaps and folds.
 * Returns array of matching UTC ISO strings.
 */
export function resolveLocalTime(local: string, timezone: string): string[] {
  if (!local || !isValidIanaTimezone(timezone)) return [];
  try {
    const fmt = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    });
    const target = local.replace('T', ' ').slice(0, 16);
    const guess = Date.parse(local + 'Z');
    if (!Number.isFinite(guess)) return [];

    const matches: string[] = [];
    for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
      const time = guess + offset * 60000;
      if (fmt.format(new Date(time)).slice(0, 16) === target) {
        matches.push(new Date(time).toISOString());
      }
    }
    return [...new Set(matches)];
  } catch {
    return [];
  }
}
