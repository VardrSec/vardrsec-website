import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {safeTemplate} from '../lib/observatory-command-policy.mjs';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
test('first report remains an explicit draft with separate public reporting windows', () => {
  const data = JSON.parse(read('research/2026-10/public-snapshot.json'));
  assert.equal(data.status, 'working-draft');
  assert.equal(data.monthly_totals, null);
  assert.equal(data.activity_window_hours, 24);
  assert.equal(data.command_window_hours, 168);
  assert.equal((Date.parse(data.activity_window_end)-Date.parse(data.activity_window_start))/3600000,24);
  assert.equal((Date.parse(data.command_window_end)-Date.parse(data.command_window_start))/3600000,168);
  assert.deepEqual(Object.keys(data.totals).sort(), ['sessions','unique_sources','auth_events','command_events','file_events'].sort());
  assert.ok(data.commands.every(row => safeTemplate(row.template) && Number.isInteger(row.count) && row.count>0));
  const html = read('report-2026-10.html');
  assert.match(html, /Working draft/);
  assert.match(html, /not monthly totals/);
  for (const count of Object.values(data.totals)) assert.ok(html.includes(count.toLocaleString('en-US')));
  assert.ok(read('research/2026-10/vardrsec-october-2026-draft-v0.1.pdf').startsWith('%PDF-'));
});
test('both navigation surfaces and homepage expose the requested research sections', () => {
  const header = read('partials/header.html');
  for (const page of ['observatory.html','blog.html']) {
    assert.equal(header.split(`href="${page}"`).length-1, 2);
    assert.ok(read('index.html').includes(`href="${page}"`));
  }
  assert.match(read('blog.html'), /blog-ssh-key-takeover.html/);
});
test('first post is listed in place of the unlisted draft and matches the frozen snapshot', () => {
  const data = JSON.parse(read('research/2026-10/public-snapshot.json'));
  const post = read('blog-ssh-key-takeover.html');
  const unescape = s => s.replaceAll('&amp;', '&').replaceAll('&gt;', '>');
  for (const count of Object.values(data.totals)) assert.ok(post.includes(count.toLocaleString('en-US')));
  for (const row of data.commands) {
    assert.ok(unescape(post).includes(row.template));
    assert.ok(post.includes(`Seen ${row.count} times`));
  }
  assert.doesNotMatch(post, /[Ww]orking draft/);
  for (const page of ['blog.html', 'index.html', 'sitemap.xml']) assert.doesNotMatch(read(page), /report-2026-10/);
  assert.match(read('report-2026-10.html'), /<meta name="robots" content="noindex"/);
  assert.match(read('sitemap.xml'), /blog-ssh-key-takeover/);
});
