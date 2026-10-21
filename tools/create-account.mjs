#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const argon2 = require(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/api/node_modules/argon2'));
const { Pool } = require(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/api/node_modules/pg'));

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
  };
  const hasFlag = (name) => args.includes(`--${name}`);

  return {
    email: getArg('email'),
    password: getArg('password'),
    count: parseInt(getArg('count') || '1', 10),
    output: getArg('output') || 'accounts.txt',
    pro: !hasFlag('free'), // Default to Pro membership
    databaseUrl: process.env.DATABASE_URL || 'postgres://jobtrack:jobtrack_local_dev@127.0.0.1:5432/jobtrack'
  };
}

// Generate secure random string
function randomString(length = 8) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

// Generate valid random password (at least 16 chars)
function generateSecurePassword() {
  const words = ['Secure', 'Tracker', 'Project', 'Cloud', 'Matrix', 'Vector', 'Alpha', 'Nexus'];
  const word1 = words[Math.floor(Math.random() * words.length)];
  const word2 = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const special = ['@', '#', '$', '!'][Math.floor(Math.random() * 4)];
  return `${word1}${special}${word2}${num}`;
}

async function main() {
  const config = parseArgs();
  const pool = new Pool({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: 5000
  });

  console.log('='.repeat(55));
  console.log('  🛠️  JOBTRACK - CÔNG CỤ TỰ ĐỘNG TẠO TÀI KHOẢN WEB');
  console.log('='.repeat(55));
  console.log(`Mục tiêu Database: ${config.databaseUrl.replace(/:[^:]+@/, ':****@')}`);
  console.log(`Số lượng tạo:     ${config.count}`);
  console.log(`File xuất kết quả: ${config.output}\n`);

  const createdAccounts = [];

  try {
    for (let i = 0; i < config.count; i++) {
      let email = config.email;
      let password = config.password;

      // If multiple accounts or no email/password provided, generate random
      if (!email || config.count > 1) {
        email = `user_${randomString(6)}@jobtrack.local`;
      }
      if (!password || config.count > 1) {
        password = generateSecurePassword();
      }

      // Validate constraints
      email = email.trim().toLowerCase();
      if (password.length < 15) {
        throw new Error(`Mật khẩu phải có độ dài từ 15 ký tự trở lên (hiện tại: ${password.length} ký tự).`);
      }

      // Hash password with argon2id
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
      const userId = crypto.randomUUID();

      // Insert into users
      await pool.query(
        `INSERT INTO users (id, email, email_normalized, password_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email_normalized) DO UPDATE 
         SET password_hash = EXCLUDED.password_hash`,
        [userId, email, email, passwordHash]
      );

      // Insert Pro membership
      if (config.pro) {
        await pool.query(
          `INSERT INTO user_memberships (user_id, tier, pro_expires_at)
           VALUES ($1, 'pro', CURRENT_TIMESTAMP + interval '1 year')
           ON CONFLICT (user_id) DO UPDATE 
           SET tier = 'pro', pro_expires_at = CURRENT_TIMESTAMP + interval '1 year'`,
          [userId]
        );
      }

      // Also create an API grant token for MCP / Extension
      const apiToken = `jt_sec_${crypto.randomBytes(16).toString('hex')}`;
      const tokenHash = crypto.createHash('sha256').update(apiToken).digest('hex');
      await pool.query(
        `INSERT INTO ai_grants (id, user_id, client, token_hash, scopes, expires_at)
         VALUES ($1, $2, 'JobTrack Auto User', $3, ARRAY['full_control'], CURRENT_TIMESTAMP + interval '1 year')`,
        [crypto.randomUUID(), userId, tokenHash]
      );

      const record = {
        userId,
        email,
        password,
        tier: config.pro ? 'PRO' : 'FREE',
        apiToken,
        createdAt: new Date().toISOString()
      };
      createdAccounts.push(record);

      // Format line for accounts.txt (tk|mk|tier|apiToken)
      const line = `${record.email}|${record.password}|${record.tier}|${record.apiToken}\n`;
      fs.appendFileSync(config.output, line, 'utf8');

      console.log(`[+] Đã tạo tài khoản #${i + 1}:`);
      console.log(`    Tài khoản (Email): ${record.email}`);
      console.log(`    Mật khẩu:          ${record.password}`);
      console.log(`    Gói dịch vụ:       ${record.tier} (Đầy đủ tính năng ATS, AI Cover Letter, Cào Web)`);
      console.log(`    API Token:         ${record.apiToken}`);
      console.log(`    Đăng nhập tại:     http://127.0.0.1:64364/#dashboard\n`);
    }

    console.log(`\n🎉 Hoàn thành! Đã lưu danh sách vào file: ${path.resolve(config.output)}`);
    console.log(`Định dạng trong file: tk|mk|tier|apiToken`);
  } catch (err) {
    console.error('❌ Lỗi khi tạo tài khoản:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
