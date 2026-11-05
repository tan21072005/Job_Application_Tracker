
import { Pool } from 'pg';
import { DeadlineReminderService } from './services/deadline-reminder-service.ts';

interface Args {
  dryRun: boolean;
  userId?: string;
  json: boolean;
  limit?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') args.dryRun = true;
    else if (token === '--json') args.json = true;
    else if (token === '--user') {
      const value = argv[i + 1];
      if (!value) throw new Error('--user cần một UUID');
      args.userId = value;
      i += 1;
    } else if (token === '--limit') {
      const value = Number(argv[i + 1]);
      if (!Number.isFinite(value) || value <= 0) throw new Error('--limit cần số dương');
      args.limit = value;
      i += 1;
    } else if (token === '--help' || token === '-h') {
      console.log(
        'Dùng: node src/reminders.ts [--dry-run] [--json] [--user <uuid>] [--limit <n>]'
      );
      process.exit(0);
    } else {
      throw new Error(`Tham số không hỗ trợ: ${token}`);
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Error: Set DATABASE_URL before running reminders.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const service = new DeadlineReminderService(pool);

  try {
    const started = Date.now();
    const result = await service.run({
      dryRun: args.dryRun,
      userId: args.userId,
      limit: args.limit
    });
    const elapsedMs = Date.now() - started;

    if (args.json) {
      console.log(JSON.stringify({ ...result, elapsedMs, dryRun: args.dryRun }, null, 2));
    } else {
      if (args.dryRun) console.log('[reminders] CHẾ ĐỘ THỬ — không gửi email thật');
      console.log(`[reminders] quét ${result.scanned} hồ sơ trong ${elapsedMs}ms`);
      console.log(`[reminders] đã gửi:              ${result.sent}`);
      console.log(`[reminders] bỏ qua (đã gửi rồi): ${result.skippedAlreadySent}`);
      console.log(`[reminders] bỏ qua (chưa cấu hình mail): ${result.skippedNoTransport}`);
      console.log(`[reminders] lỗi:                 ${result.failed}`);
      for (const item of result.delivered) {
        console.log(`   → ${item.bucket} · ${item.to} · ${item.subject}`);
      }
      if (result.skippedNoTransport > 0) {
        console.log(
          '\n[reminders] Chưa cấu hình transport email. Đặt BREVO_API_KEY '
          + '(hoặc SMTP_HOST) để gửi thật.'
        );
      }
    }

    process.exitCode = result.failed > 0 ? 1 : 0;
  } catch (error) {
    console.error('[reminders] thất bại:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

await main();
