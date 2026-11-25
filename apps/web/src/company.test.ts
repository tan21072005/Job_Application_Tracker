import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { companyRepository } from './data';
import { ApiError } from './transport';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Company Repository (demoMode)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns an honest empty profile for a company with no data', async () => {
    const profile = await companyRepository.get('Viettel Digital');
    expect(profile.name).toBe('Viettel Digital');
    expect(profile.cultureScores).toBeNull();
    expect(profile.salaryBenchmarks).toEqual([]);
    expect(profile.interviewQuestions).toEqual([]);
    expect(profile.keyPros).toEqual([]);
    expect(profile.keyRedFlags).toEqual([]);
    expect(profile.industry).toBe('');
    expect(profile.size).toBe('');
    expect(profile.provenance).toEqual({});
    expect(profile.places).toBeNull();
  });

  it('does not ship a hand-written dossier for a well-known company either', async () => {
    const profile = await companyRepository.get('VNG Corporation');
    expect(profile.name).toBe('VNG Corporation');
    expect(profile.industry).toBe('');
    expect(profile.techStack).toEqual([]);
    expect(profile.cultureScores).toBeNull();
  });

  it('validates and rejects review with invalid rating or missing fields', async () => {
    await expect(
      companyRepository.addReview('FPT Software', {
        role: '',
        rating: 10,
        workLifeBalance: 4,
        compensationRating: 4,
        careerGrowth: 4,
        managementRating: 4,
        recommend: true,
        pros: 'Ngắn',
        cons: 'Ngắn'
      })
    ).rejects.toThrow(ApiError);
  });

  it('successfully submits review and updates company culture score aggregates', async () => {
    const initial = await companyRepository.get('NAB Innovation');
    const initialReviewCount = initial.recentReviews.length;

    const newReview = await companyRepository.addReview('NAB Innovation', {
      role: 'Senior QA Engineer',
      rating: 5,
      workLifeBalance: 5,
      compensationRating: 5,
      careerGrowth: 4,
      managementRating: 5,
      recommend: true,
      pros: 'Chế độ đãi ngộ xuất sắc, văn phòng hiện đại',
      cons: 'Quy trình ngân hàng khá chặt chẽ',
      advice: 'Tập trung nâng cao tiếng Anh'
    });

    expect(newReview.id).toBeTruthy();
    expect(newReview.role).toBe('Senior QA Engineer');
    expect(newReview.rating).toBe(5);

    const updated = await companyRepository.get('NAB Innovation');
    expect(updated.recentReviews.length).toBe(initialReviewCount + 1);
    expect(updated.cultureScores?.totalReviews).toBe(initialReviewCount + 1);
    expect(updated.recentReviews[0].pros).toBe('Chế độ đãi ngộ xuất sắc, văn phòng hiện đại');
  });

  it('returns no salary benchmarks when nobody has contributed any', async () => {
    const salaries = await companyRepository.getSalaries('VNG Corporation');
    expect(Array.isArray(salaries)).toBe(true);
    expect(salaries).toEqual([]);
  });
});
