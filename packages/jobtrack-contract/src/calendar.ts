export function formatIcsDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return '19700101T000000Z';
  }
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export interface IcsCalendarEvent {
  id: string;
  title: string;
  company: string;
  position: string;
  at: string;
  timezone?: string;
  format?: string;
  location?: string | null;
  notes?: string | null;
  durationMinutes?: number;
}

export function generateIcsCalendar(events: IcsCalendarEvent[]): string {
  const nowIcs = formatIcsDateTime(new Date().toISOString());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JobTrack//Interview Calendar//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  for (const event of events) {
    const startDate = new Date(event.at);
    const duration = event.durationMinutes && event.durationMinutes > 0 ? event.durationMinutes : 60;
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

    const startIcs = formatIcsDateTime(event.at);
    const endIcs = formatIcsDateTime(endDate.toISOString());
    const summary = escapeIcsText(`[Phỏng vấn] ${event.title} - ${event.company} (${event.position})`);
    
    const descParts: string[] = [
      `Vị trí: ${event.position}`,
      `Công ty: ${event.company}`,
      `Vòng: ${event.title}`,
      `Hình thức: ${event.format || 'Online'}`
    ];
    if (event.location) {
      descParts.push(`Địa điểm/Link: ${event.location}`);
    }
    if (event.timezone) {
      descParts.push(`Múi giờ: ${event.timezone}`);
    }
    if (event.notes) {
      descParts.push(`Ghi chú: ${event.notes}`);
    }
    const description = escapeIcsText(descParts.join('\n'));

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:jt-interview-${event.id}@jobtrack.local`);
    lines.push(`DTSTAMP:${nowIcs}`);
    lines.push(`DTSTART:${startIcs}`);
    lines.push(`DTEND:${endIcs}`);
    lines.push(`SUMMARY:${summary}`);
    if (event.location) {
      lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    }
    lines.push(`DESCRIPTION:${description}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
