import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { repository } from './data';
import { fixture } from './demo';
import { parseApplicationsFromCsv, type CsvImportItemInput } from '@jobtrack/contract';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('CSV Import Repository & Parser (demoMode)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
    storageMap.set('jobtrack.design.v1', JSON.stringify(fixture()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses valid CSV text with bilingual headers and detects valid rows', () => {
    const csv = `Công ty,Vị trí,Trạng thái,Mức lương,Địa điểm,Ngày nộp,Link bài đăng\n` +
      `"Zalo Pay","Staff Android Engineer","Applied","60,000,000 VND","TP.HCM","2026-10-21","https://zalopay.vn/job/1"\n` +
      `"Viettel Solutions","Solutions Architect","Interview","70,000,000 VND","Hà Nội","2026-10-23","https://viettel.vn/job/2"`;

    const preview = parseApplicationsFromCsv(csv);
    expect(preview.totalRows).toBe(2);
    expect(preview.validRowsCount).toBe(2);
    expect(preview.duplicateRowsCount).toBe(0);
    expect(preview.errorRowsCount).toBe(0);

    const validRows = preview.rows.filter(r => r.isValid && !r.isDuplicate);
    expect(validRows.length).toBe(2);
    expect(validRows[0]?.company).toBe('Zalo Pay');
    expect(validRows[0]?.position).toBe('Staff Android Engineer');
    expect(validRows[0]?.status).toBe('Applied');
    expect(validRows[1]?.company).toBe('Viettel Solutions');
  });

  it('imports valid rows into demoMode storage and reflects in applications list', async () => {
    const rows: CsvImportItemInput[] = [
      {
        company: 'One Mount Group',
        position: 'Principal Data Engineer',
        location: 'Hà Nội',
        status: 'Applied',
        appliedAt: '2026-10-20',
        url: 'https://onemount.vn/careers/de-principal'
      },
      {
        company: 'VNPAY',
        position: 'Security Specialist',
        location: 'Hà Nội',
        status: 'Saved'
      }
    ];

    const result = await repository.importCsv(rows, true);
    expect(result.importedCount).toBe(2);
    expect(result.skippedDuplicatesCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(result.insertedIds.length).toBe(2);

    const apps = await repository.list();
    const om = apps.find(a => a.company === 'One Mount Group');
    expect(om).toBeDefined();
    expect(om?.position).toBe('Principal Data Engineer');
    expect(om?.status).toBe('Applied');

    const vnpay = apps.find(a => a.company === 'VNPAY');
    expect(vnpay).toBeDefined();
    expect(vnpay?.position).toBe('Security Specialist');
  });

  it('detects duplicate applications and skips them when skipDuplicates is true', async () => {
    const existing = await repository.list();
    const first = existing[0];
    expect(first).toBeDefined();

    const rows: CsvImportItemInput[] = [
      {
        company: first!.company,
        position: first!.position,
        url: first!.url
      },
      {
        company: 'Grab Singapore',
        position: 'Backend Engineer',
        url: 'https://grab.careers/be-1'
      }
    ];

    const result = await repository.importCsv(rows, true);
    expect(result.importedCount).toBe(1);
    expect(result.skippedDuplicatesCount).toBe(1);
    expect(result.insertedIds.length).toBe(1);

    const apps = await repository.list();
    const grab = apps.find(a => a.company === 'Grab Singapore');
    expect(grab).toBeDefined();
  });

  it('records duplicate error when skipDuplicates is false', async () => {
    const existing = await repository.list();
    const first = existing[0];
    expect(first).toBeDefined();

    const rows: CsvImportItemInput[] = [
      {
        company: first!.company,
        position: first!.position
      }
    ];

    const result = await repository.importCsv(rows, false);
    expect(result.importedCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]?.field).toBe('duplicate');
  });
});
