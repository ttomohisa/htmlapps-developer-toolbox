import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import test from 'node:test';
import assert from 'node:assert/strict';
const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const source = read('src/index.template.html');
// CSS contracts complement, but do not replace, native wheel/geometry verification.
function assertLock(html) {
  assert.match(html, /html:has\(dialog:modal\),\s*body:has\(dialog:modal\)\s*\{\s*overflow:\s*hidden;?\s*\}/);
}
test('native modal lock covers both background scroll containers', () => assertLock(source));
test('Help documents temporary background locking in JA and EN', () => {
  assert.match(source, /ダイアログを開いている間は背景のスクロールが止まります。/);
  assert.match(source, /Background scrolling is paused while a dialog is open\./);
});
test('all generated variants retain the modal lock and source Help markup', () => {
  const readable = read('dist/index.html'), root = read('developer-toolbox.html');
  const wrapper = read('dist/index.self-extract.html');
  const payload = wrapper.match(/<script id="self-extract-payload"[^>]*>([A-Za-z0-9+/=\r\n]+)<\/script>/)[1];
  const restored = gunzipSync(Buffer.from(payload, 'base64')).toString('utf8');
  const help = html => html.match(/<dialog\b[^>]*id="helpDialog"[\s\S]*?<\/dialog>/)[0];
  for (const html of [readable, root, restored]) { assertLock(html); assert.equal(help(html), help(source)); }
  assert.equal(root, readable); assert.equal(restored, readable);
});
