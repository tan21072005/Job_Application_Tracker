import { emptyDraft, statuses, type Application } from './domain';

const validDate = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const validZone = (value: unknown) => { try { if (typeof value !== 'string' || !value) return false; new Intl.DateTimeFormat('vi', { timeZone: value }); return true; } catch { return false; } };
export function validApplications(value: unknown): value is Application[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  return value.every(app => {
    if (!app || typeof app.id !== 'string' || !app.id || ids.has(app.id)) return false;
    ids.add(app.id);
    if (app.version !== undefined && (!Number.isInteger(app.version) || app.version < 1)) return false;
    if (!Object.keys(emptyDraft).every(key => typeof app[key] === 'string') || !statuses.includes(app.status) || !app.company.trim() || !app.position.trim() || !validDate(app.createdAt)) return false;
    if (app.url) { try { if (!['http:', 'https:'].includes(new URL(app.url).protocol)) return false; } catch { return false; } }
    if ((app.deadline && !validDate(app.deadline)) || (app.appliedAt && !validDate(app.appliedAt)) || !Array.isArray(app.interviews)) return false;
    const rounds = new Set<string>();
    return app.interviews.every((round: Record<string, unknown>) => {
      if (!round || !['id', 'title', 'at', 'timezone', 'format', 'location', 'preparation', 'notes', 'status'].every(key => typeof round[key] === 'string') || !round.id || rounds.has(round.id as string)) return false;
      rounds.add(round.id as string);
      return validDate(round.at) && validZone(round.timezone) && ['Scheduled', 'Completed', 'Cancelled'].includes(round.status as string);
    });
  });
}
