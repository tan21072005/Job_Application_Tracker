import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

test('Extension: Manifest V3 configuration adheres to Chrome Web Store policies', () => {
  const manifestRaw = readFileSync(join(__dirname, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestRaw);

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, 'PageWeave — Web Data Assistant & JobTrack Pro');
  assert.ok(manifest.permissions.includes('activeTab'));
  assert.ok(manifest.permissions.includes('storage'));
  assert.ok(manifest.permissions.includes('sidePanel'), 'Must include sidePanel permission');
  assert.equal(manifest.side_panel?.default_path, 'popup.html');
  assert.equal(manifest.action?.default_popup, 'popup.html');
  assert.ok(manifest.content_scripts.length > 0);
});

test('Extension: Security audit verifies NO hardcoded secret tokens in source code', () => {
  const filesToCheck = ['content.js', 'popup.js', 'options.js', 'popup.html', 'options.html', 'README.md'];
  const secretPattern = /jt_sec_[a-f0-9]{24,}/i;

  for (const filename of filesToCheck) {
    const content = readFileSync(join(__dirname, filename), 'utf8');
    const match = content.match(secretPattern);
    assert.equal(
      match,
      null,
      `Security violation: Hardcoded token found in ${filename}: ${match ? match[0] : ''}`
    );
  }
});

test('Extension: Storage calls use chrome.storage.local instead of chrome.storage.sync for credentials', () => {
  const popupJs = readFileSync(join(__dirname, 'popup.js'), 'utf8');
  const optionsJs = readFileSync(join(__dirname, 'options.js'), 'utf8');
  const contentJs = readFileSync(join(__dirname, 'content.js'), 'utf8');

  assert.ok(popupJs.includes('chrome.storage.local'), 'popup.js must use chrome.storage.local');
  assert.ok(!popupJs.includes('chrome.storage.sync'), 'popup.js must not use chrome.storage.sync');

  assert.ok(optionsJs.includes('chrome.storage.local'), 'options.js must use chrome.storage.local');
  assert.ok(!optionsJs.includes('chrome.storage.sync'), 'options.js must not use chrome.storage.sync');

  assert.ok(contentJs.includes('chrome.storage.local'), 'content.js must use chrome.storage.local');
  assert.ok(!contentJs.includes('chrome.storage.sync'), 'content.js must not use chrome.storage.sync');
});

test('Extension: Pricing calculations and discount labels are mathematically accurate', () => {
  const monthlyPrice = 99000;
  const quarterlyPrice = 249000;
  const yearlyPrice = 799000;

  // 3 months at monthly price: 3 * 99,000 = 297,000đ
  // Discount = (297000 - 249000) / 297000 = 16.16%
  const quarterlyDiscount = ((3 * monthlyPrice - quarterlyPrice) / (3 * monthlyPrice)) * 100;
  assert.ok(Math.abs(quarterlyDiscount - 16.16) < 0.1);

  // 12 months at monthly price: 12 * 99,000 = 1,188,000đ
  // Discount = (1188000 - 799000) / 1188000 = 32.74%
  const yearlyDiscount = ((12 * monthlyPrice - yearlyPrice) / (12 * monthlyPrice)) * 100;
  assert.ok(Math.abs(yearlyDiscount - 32.74) < 0.1);

  const popupHtml = readFileSync(join(__dirname, 'popup.html'), 'utf8');
  assert.ok(popupHtml.includes('16%'), 'popup.html must state 16% discount for quarterly');
  assert.ok(popupHtml.includes('33%'), 'popup.html must state 33% discount for yearly');
  assert.ok(!popupHtml.includes('20%'), 'popup.html must not use inaccurate 20% discount label');
  assert.ok(!popupHtml.includes('35%'), 'popup.html must not use inaccurate 35% discount label');
});

test('Extension: Dual interface provides both Universal Data Capture and JobTrack Pro tabs', () => {
  const popupHtml = readFileSync(join(__dirname, 'popup.html'), 'utf8');
  const popupJs = readFileSync(join(__dirname, 'popup.js'), 'utf8');

  // Verify tabs
  assert.ok(popupHtml.includes('tab-capture'), 'Must contain Universal Capture tab');
  assert.ok(popupHtml.includes('tab-datasets'), 'Must contain Datasets management tab');
  assert.ok(popupHtml.includes('tab-jobtrack'), 'Must contain JobTrack Core tab');
  assert.ok(popupHtml.includes('tab-account'), 'Must contain Account & Pro tab');

  // Verify pairing flow
  assert.ok(popupJs.includes('/api/auth/extension/pair') || popupJs.includes('pairWithWebApp'), 'Must support pairing flow');
  assert.ok(popupJs.includes('pairAccountBtn'), 'Must include pair account action');
});

test('Extension: Multi-layer extraction engine supports tables, repeating cards, and schema metadata', () => {
  const contentJs = readFileSync(join(__dirname, 'content.js'), 'utf8');

  // Layer 1: HTML Tables
  assert.ok(contentJs.includes('detectHtmlTables'), 'Must implement HTML table detector');

  // Layer 2: Repeating Cards / Lists
  assert.ok(contentJs.includes('detectRepeatingLists'), 'Must implement repeating lists detector');

  // Layer 3: Selection text
  assert.ok(contentJs.includes('getSelection') || contentJs.includes('selectedText'), 'Must implement selection text capture');

  // Layer 4: Schema.org / OpenGraph
  assert.ok(contentJs.includes('extractMetadata'), 'Must implement metadata extractor');

  // Layer 5: JobTrack recruitment adapter
  assert.ok(contentJs.includes('extractCurrentPageJob'), 'Must implement JobTrack recruitment extractor');
});

test('Extension: Dynamic content script injection fallback and reliable scan feedback', () => {
  const popupJs = readFileSync(join(__dirname, 'popup.js'), 'utf8');
  const contentJs = readFileSync(join(__dirname, 'content.js'), 'utf8');

  // Verify PING / injection handshake
  assert.ok(contentJs.includes("'PING'"), 'content.js must handle PING action');
  assert.ok(popupJs.includes('chrome.scripting.executeScript'), 'popup.js must support programmatic executeScript injection fallback');
  assert.ok(popupJs.includes('ensureContentScriptInjected'), 'popup.js must have ensureContentScriptInjected helper');

  // Verify rescan button awaits scanPageData
  assert.ok(popupJs.includes('await scanPageData()'), 'rescanBtn must await scanPageData() before showing alert');

  // Verify job posting structured rendering in meta source
  assert.ok(popupJs.includes('jobPosting'), 'renderMetaSource must format jobPosting fields when present');
});


