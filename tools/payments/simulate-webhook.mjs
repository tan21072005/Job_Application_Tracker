#!/usr/bin/env node
import { createHmac } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TRANSFER_CODE_PATTERN = /^JTPRO[A-Z0-9]{6}$/;
const AMOUNT_PLAIN_PATTERN = /^\d{1,9}$/;
const AMOUNT_GROUPED_PATTERN = /^\d{1,3}[.,]\d{3}$/;
const TRAILING_SLASH_PATTERN = /\/+$/;
const BRACKETED_HOST_PATTERN = /^\[|\]$/g;

export const SIGNATURE_PREFIX = 'v1=';
export const SIGNATURE_HEADER = 'X-JobTrack-Signature';
export const TIMESTAMP_HEADER = 'X-JobTrack-Timestamp';
export const MIN_WEBHOOK_SECRET_LENGTH = 16;
export const WEBHOOK_PATH = '/api/pro/webhook';
export const DEFAULT_BASE_URL = 'http://127.0.0.1:64366';
export const PAYMENT_MODE_ENV = 'PAYMENT_MODE';
export const PAYMENT_TEST_MODE = 'test';
export const SECRET_ENV = 'PAYMENT_WEBHOOK_SECRET';
export const BASE_URL_ENV = 'JOBTRACK_API_BASE_URL';
export const TRANSFER_CODE_ENV = 'JOBTRACK_TEST_TRANSFER_CODE';
export const EXIT_OK = 0;
export const EXIT_CONFIG = 1;
export const EXIT_BLOCKED = 2;

const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '::1'];
const VALUE_FLAGS = ['base-url', 'transfer-code', 'amount'];
const KNOWN_FLAGS = [...VALUE_FLAGS, 'dry-run', 'help'];
const REQUEST_TIMEOUT_MS = 15000;
const SEPARATOR = '================================================================';

export class ToolError extends Error {
  constructor(message, exitCode = EXIT_CONFIG) {
    super(message);
    this.name = 'ToolError';
    this.exitCode = exitCode;
  }
}

export function getArg(args, name, fallback = undefined) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (value === undefined || value.startsWith('--')) return fallback;
  return value;
}

export function hasFlag(args, name) {
  return args.includes(`--${name}`);
}

export function parseArgs(argv = process.argv.slice(2)) {
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const name = arg.slice(2);
    if (!KNOWN_FLAGS.includes(name)) {
      const known = KNOWN_FLAGS.map(flag => `--${flag}`).join(', ');
      throw new ToolError(`CONFIGURATION ERROR: unknown flag --${name}. Known flags: ${known}.`, EXIT_CONFIG);
    }
  }
  for (const name of VALUE_FLAGS) {
    if (!hasFlag(argv, name)) continue;
    const value = getArg(argv, name);
    if (value === undefined || value.trim() === '') {
      throw new ToolError(`CONFIGURATION ERROR: --${name} requires a value.`, EXIT_CONFIG);
    }
  }
  return {
    baseUrl: getArg(argv, 'base-url'),
    transferCode: getArg(argv, 'transfer-code'),
    amount: getArg(argv, 'amount'),
    dryRun: hasFlag(argv, 'dry-run'),
    help: hasFlag(argv, 'help')
  };
}

export function resolveBaseUrl(parsed, env = process.env) {
  const candidate = parsed.baseUrl || env[BASE_URL_ENV] || DEFAULT_BASE_URL;
  let target;
  try {
    target = new URL(candidate);
  } catch {
    throw new ToolError(
      `CONFIGURATION ERROR: the target "${candidate}" is not a valid URL. Use --base-url or ${BASE_URL_ENV} with a full URL such as ${DEFAULT_BASE_URL}.`,
      EXIT_CONFIG
    );
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw new ToolError(
      `BLOCKED: the simulator refuses the protocol ${target.protocol}. Only http and https are supported.`,
      EXIT_BLOCKED
    );
  }
  const host = target.hostname.replace(BRACKETED_HOST_PATTERN, '');
  if (!LOOPBACK_HOSTS.includes(host)) {
    throw new ToolError(
      `BLOCKED: the simulator only sends to a loopback host. The resolved target ${target.hostname} is not one of ${LOOPBACK_HOSTS.join(', ')}. Use --base-url or ${BASE_URL_ENV} to point at the local API.`,
      EXIT_BLOCKED
    );
  }
  return target;
}

export function resolvePaymentMode(env = process.env) {
  const mode = env[PAYMENT_MODE_ENV];
  if (mode !== PAYMENT_TEST_MODE) {
    const observed = mode === undefined ? 'is not set' : `is not exactly "${PAYMENT_TEST_MODE}"`;
    throw new ToolError(
      `BLOCKED: ${PAYMENT_MODE_ENV} ${observed}. The server compares this value absolutely, so the simulator refuses to run until ${PAYMENT_MODE_ENV}=${PAYMENT_TEST_MODE} is exported in this shell.`,
      EXIT_BLOCKED
    );
  }
  return mode;
}

export function resolveSecret(env = process.env) {
  const secret = env[SECRET_ENV];
  if (typeof secret !== 'string' || secret.trim() === '') {
    throw new ToolError(
      `CONFIGURATION ERROR: ${SECRET_ENV} is not set. Export a test secret of at least ${MIN_WEBHOOK_SECRET_LENGTH} characters before running the simulator.`,
      EXIT_CONFIG
    );
  }
  if (secret.length < MIN_WEBHOOK_SECRET_LENGTH) {
    throw new ToolError(
      `CONFIGURATION ERROR: ${SECRET_ENV} must be at least ${MIN_WEBHOOK_SECRET_LENGTH} characters; the current value has ${secret.length}.`,
      EXIT_CONFIG
    );
  }
  return secret;
}

export function resolveTransferCode(parsed, env = process.env) {
  const raw = parsed.transferCode || env[TRANSFER_CODE_ENV] || '';
  const code = raw.trim().toUpperCase();
  if (!code) {
    throw new ToolError(
      `CONFIGURATION ERROR: no transfer code. Pass --transfer-code <code> or set ${TRANSFER_CODE_ENV}.`,
      EXIT_CONFIG
    );
  }
  if (!TRANSFER_CODE_PATTERN.test(code)) {
    throw new ToolError(
      `CONFIGURATION ERROR: the transfer code must be JTPRO followed by 6 letters or digits, the shape the server accepts. Check --transfer-code or ${TRANSFER_CODE_ENV}.`,
      EXIT_CONFIG
    );
  }
  return code;
}

export function resolveAmount(parsed) {
  const raw = (parsed.amount || '').trim();
  if (!raw) {
    throw new ToolError(
      'CONFIGURATION ERROR: --amount is required. Pass the order amount in whole VND, for example --amount 99000.',
      EXIT_CONFIG
    );
  }
  if (AMOUNT_PLAIN_PATTERN.test(raw)) return Number(raw);
  if (AMOUNT_GROUPED_PATTERN.test(raw)) return Number(raw.replace(/[.,]/g, ''));
  throw new ToolError(
    'CONFIGURATION ERROR: --amount must be a whole VND amount, either 99000 or an integer with exactly one thousands separator such as 249.000. The server also accepts a number with at most two decimals, but the simulator sends whole amounts only.',
    EXIT_CONFIG
  );
}

export function signPayload({ secret, timestamp, rawBody }) {
  return `${SIGNATURE_PREFIX}${createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex')}`;
}

export function buildWebhookRequest({ baseUrl, timestamp, rawBody, signature }) {
  const target = new URL(`${String(baseUrl).replace(TRAILING_SLASH_PATTERN, '')}${WEBHOOK_PATH}`);
  return {
    url: target,
    method: 'POST',
    path: target.pathname,
    headers: {
      'Content-Type': 'application/json',
      [TIMESTAMP_HEADER]: timestamp,
      [SIGNATURE_HEADER]: signature
    },
    rawBody
  };
}

export function sendWebhookRequest(request) {
  const transport = request.url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const clientRequest = transport.request(request.url, { method: request.method, headers: request.headers }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        resolve({ status: response.statusCode || 0, body: Buffer.concat(chunks).toString('utf8') });
      });
    });
    clientRequest.setTimeout(REQUEST_TIMEOUT_MS, () => {
      clientRequest.destroy(new Error(`the request to ${request.url.origin}${request.path} timed out after ${REQUEST_TIMEOUT_MS} ms`));
    });
    clientRequest.on('error', reject);
    clientRequest.end(request.rawBody);
  });
}

export function parseJsonBody(text) {
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

export function printRequest(request, log) {
  log(SEPARATOR);
  log('JOBTRACK PAYMENT WEBHOOK SIMULATOR');
  log(SEPARATOR);
  log(`Target:        ${request.url.origin}${request.path}`);
  log(`Method:        ${request.method}`);
  log('Headers:');
  for (const [name, value] of Object.entries(request.headers)) {
    log(`  ${name}: ${value}`);
  }
  log('Body:');
  log(request.rawBody);
  log(SEPARATOR);
}

export function printUsage(log) {
  log('Usage: node tools/payments/simulate-webhook.mjs [options]');
  log('');
  log('Options:');
  log(`  --base-url <url>       Target API base URL. Default: ${BASE_URL_ENV} or ${DEFAULT_BASE_URL}. Only loopback hosts are allowed.`);
  log(`  --transfer-code <code> Order code to settle. Default: ${TRANSFER_CODE_ENV}. Shape: JTPRO plus 6 letters or digits.`);
  log('  --amount <vnd>         Order amount in whole VND, for example 99000 or 249.000.');
  log('  --dry-run              Print the signed request and send nothing.');
  log('  --help                 Print this help.');
  log('');
  log(`Environment: ${PAYMENT_MODE_ENV} must be ${PAYMENT_TEST_MODE}; ${SECRET_ENV} must hold at least ${MIN_WEBHOOK_SECRET_LENGTH} characters.`);
  log('Exit codes: 0 success, 1 configuration or network error, 2 blocked or rejected.');
}

export async function runSimulation({ parsed, env = process.env, log = console.log } = {}) {
  const baseUrl = resolveBaseUrl(parsed, env);
  resolvePaymentMode(env);
  const secret = resolveSecret(env);
  const transferCode = resolveTransferCode(parsed, env);
  const amount = resolveAmount(parsed);
  const timestamp = String(Date.now());
  const rawBody = JSON.stringify({ transferCode, amount });
  const signature = signPayload({ secret, timestamp, rawBody });
  const request = buildWebhookRequest({ baseUrl, timestamp, rawBody, signature });

  if (parsed.dryRun) {
    printRequest(request, log);
    log('Dry run: nothing was sent. Drop --dry-run to send this request.');
    log(SEPARATOR);
    return { exitCode: EXIT_OK, sent: false, status: null, body: null, code: null };
  }

  let response;
  try {
    response = await sendWebhookRequest(request);
  } catch (error) {
    const detail = error && error.message ? error.message : String(error);
    throw new ToolError(
      `NETWORK ERROR: the API at ${request.url.origin}${request.path} did not answer: ${detail}. Nothing was activated by this call.`,
      EXIT_CONFIG
    );
  }
  log(`HTTP ${response.status}`);
  log(response.body);
  const parsedBody = parseJsonBody(response.body);
  const code = parsedBody && typeof parsedBody.code === 'string' ? parsedBody.code : null;
  if (code) log(`API code: ${code}`);

  if (response.status >= 200 && response.status < 300) {
    if (parsedBody && parsedBody.success === true) {
      return { exitCode: EXIT_OK, sent: true, status: response.status, body: response.body, code };
    }
    throw new ToolError(
      `The API answered with HTTP ${response.status} but the body does not contain "success": true. The webhook was not applied.`,
      EXIT_CONFIG
    );
  }

  throw new ToolError(
    `The API rejected the webhook with HTTP ${response.status}${code ? ` and code ${code}` : ''}. No order was changed by this call.`,
    EXIT_BLOCKED
  );
}

export async function main(argv = process.argv.slice(2)) {
  try {
    const parsed = parseArgs(argv);
    if (parsed.help) {
      printUsage(console.log);
      return EXIT_OK;
    }
    const result = await runSimulation({ parsed });
    process.exitCode = result.exitCode;
    return result.exitCode;
  } catch (error) {
    const exitCode = error instanceof ToolError ? error.exitCode : EXIT_CONFIG;
    const message = error && error.message ? error.message : String(error);
    console.error(error instanceof ToolError ? message : `ERROR: ${message}`);
    process.exitCode = exitCode;
    return exitCode;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(error => {
    console.error(`ERROR: ${error && error.message ? error.message : String(error)}`);
    process.exitCode = EXIT_CONFIG;
  });
}
