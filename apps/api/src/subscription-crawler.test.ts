import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import {
  SubscriptionCrawlerService,
  normalizeJobUrl,
  type CrawledJobItem
} from './services/subscription-crawler.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 3 });

test('Crawler: normalizeJobUrl strips tracking parameters and trailing slashes', () => {
  const url1 = 'https://vn.linkedin.com/jobs/view/123456?utm_source=feed&utm_medium=email&ref=share/';
  assert.equal(normalizeJobUrl(url1), 'https://vn.linkedin.com/jobs/view/123456');

  const url2 = 'https://topcv.vn/viec-lam/senior-backend-nodejs/998877.html?fbclid=XYZ123&trackingId=abc';
  assert.equal(normalizeJobUrl(url2), 'https://topcv.vn/viec-lam/senior-backend-nodejs/998877.html');

  const url3 = 'https://itviec.com/it-jobs/reactjs-lead/';
  assert.equal(normalizeJobUrl(url3), 'https://itviec.com/it-jobs/reactjs-lead');
});

test('Crawler: matchesSubscription evaluates keywords and location accurately', () => {
  const crawler = new SubscriptionCrawlerService(pool);
  const sub = {
    id: randomUUID(),
    userId: randomUUID(),
    title: 'Senior Node.js Developer',
    keywords: ['Node.js', 'Backend'],
    location: 'Hồ Chí Minh',
    minSalary: 2000,
    sources: ['rss'],
    isActive: true,
    lastCheckedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const matchingItem: CrawledJobItem = {
    company: 'VNG Tech',
    position: 'Senior Backend Engineer (Node.js)',
    location: 'Quận 7, Hồ Chí Minh',
    url: 'https://vng.com/careers/123',
    description: 'Tìm kiếm kỹ sư Backend am hiểu Node.js và Microservices'
  };
  assert.equal(crawler.matchesSubscription(matchingItem, sub), true);

  const wrongLocationItem: CrawledJobItem = {
    company: 'Viettel Telecom',
    position: 'Senior Node.js Developer',
    location: 'Hà Nội',
    url: 'https://viettel.vn/careers/456'
  };
  assert.equal(crawler.matchesSubscription(wrongLocationItem, sub), false);

  const missingKeywordItem: CrawledJobItem = {
    company: 'FPT Software',
    position: 'Frontend React Developer',
    location: 'Hồ Chí Minh',
    url: 'https://fpt.com/careers/789'
  };
  assert.equal(crawler.matchesSubscription(missingKeywordItem, sub), false);
});

test('Crawler: subscription lifecycle and crawl run with deduplication', async () => {
  const crawler = new SubscriptionCrawlerService(pool);

  // 1. Create a test user
  const userId = randomUUID();
  await pool.query(
    `INSERT INTO users (id, email, email_normalized, password_hash)
     VALUES ($1, $2, $3, '$argon2id$v=19$m=65536,t=3,p=4$dummyhashforunittest')`,
    [userId, `crawler_${userId}@example.com`, `crawler_${userId}@example.com`]
  );

  try {
    // 2. Create subscription
    const sub = await crawler.createSubscription(userId, {
      title: 'Fullstack TypeScript',
      keywords: ['TypeScript', 'Fullstack'],
      location: 'Hồ Chí Minh',
      sources: ['rss', 'itviec']
    });
    assert.ok(sub.id);
    assert.equal(sub.title, 'Fullstack TypeScript');
    assert.deepEqual(sub.keywords, ['TypeScript', 'Fullstack']);

    // 3. List subscriptions
    const subs = await crawler.listSubscriptions(userId);
    assert.equal(subs.length, 1);
    assert.equal(subs[0].id, sub.id);

    // 4. Run crawl against sample feed
    const feedItems: CrawledJobItem[] = [
      {
        company: 'Axon Vietnam',
        position: 'Fullstack TypeScript Engineer',
        location: 'Hồ Chí Minh',
        url: 'https://axon.com/jobs/ts-1?utm_source=linkedin',
        salary: '2500 - 3500 USD',
        workMode: 'Hybrid'
      },
      {
        company: 'Shopee VN',
        position: 'Fullstack TypeScript Lead',
        location: 'Hồ Chí Minh',
        url: 'https://careers.shopee.vn/job/ts-lead',
        salary: '3000 - 4500 USD',
        workMode: 'Onsite'
      },
      {
        company: 'Remote Inc',
        position: 'Junior Python Developer',
        location: 'Đà Nẵng',
        url: 'https://remote.com/jobs/py-1'
      }
    ];

    const crawlResult = await crawler.runSubscription(userId, sub.id, feedItems);
    assert.equal(crawlResult.found, 3);
    assert.equal(crawlResult.matched, 2); // 2 matched TS in HCM
    assert.equal(crawlResult.saved, 2);
    assert.equal(crawlResult.skippedDuplicates, 0);

    // 5. Verify saved applications in DB
    const savedApps = (await pool.query(
      `SELECT company, position, status, url, work_mode FROM applications WHERE user_id = $1 ORDER BY company ASC`,
      [userId]
    )).rows;
    assert.equal(savedApps.length, 2);
    assert.equal(savedApps[0].company, 'Axon Vietnam');
    assert.equal(savedApps[0].status, 'Saved');
    assert.equal(savedApps[0].url, 'https://axon.com/jobs/ts-1'); // URL normalized (utm stripped)
    assert.equal(savedApps[0].work_mode, 'Hybrid');

    // 6. Run crawl second time with same and new items -> Deduplication verification
    const repeatFeed: CrawledJobItem[] = [
      {
        company: 'Axon Vietnam',
        position: 'Fullstack TypeScript Engineer',
        location: 'Hồ Chí Minh',
        url: 'https://axon.com/jobs/ts-1?fbclid=another_click_id' // duplicate URL & company+position
      },
      {
        company: 'Shopee VN', // duplicate company + position with different URL
        position: 'Fullstack TypeScript Lead',
        location: 'Hồ Chí Minh',
        url: 'https://careers.shopee.vn/job/ts-lead-mirror'
      },
      {
        company: 'NAB Innovation',
        position: 'Senior Fullstack TypeScript',
        location: 'Hồ Chí Minh',
        url: 'https://nab.com/careers/ts-nab'
      }
    ];

    const secondCrawlResult = await crawler.runSubscription(userId, sub.id, repeatFeed);
    assert.equal(secondCrawlResult.matched, 3);
    assert.equal(secondCrawlResult.saved, 1); // Only NAB Innovation is new
    assert.equal(secondCrawlResult.skippedDuplicates, 2);

    // 7. Delete subscription
    const deleted = await crawler.deleteSubscription(userId, sub.id);
    assert.equal(deleted, true);
    const subsAfter = await crawler.listSubscriptions(userId);
    assert.equal(subsAfter.length, 0);
  } finally {
    // Cleanup
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  }
});

test.after(async () => {
  await pool.end();
});
