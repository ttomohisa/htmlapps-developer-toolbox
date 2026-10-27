import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const source = read('src/index.template.html');
// CSS contracts complement, but do not replace, native wheel/geometry verification.
function assertLock(html) {
  assert.match(html, /html:has\(dialog:modal\),\s*body:has\(dialog:modal\)\s*\{\s*overflow:\s*hidden;?\s*\}/);
}
test('native modal lock covers both background scroll containers', () => assertLock(source));
test('Help excludes layout audit prose in JA and EN', () => {
  assert.doesNotMatch(source, /ダイアログを開いている間は背景のスクロールが止まります。/);
  assert.doesNotMatch(source, /Background scrolling is paused while a dialog is open\./);
});
test('all generated variants retain the modal lock and source Help markup', () => {
  const readable = read('dist/index.html'), root = read('developer-toolbox.html');
  const wrapper = read('dist/index.self-extract.html');
  const payload = wrapper.match(/<script id="self-extract-payload"[^>]*>([A-Za-z0-9+/=\r\n]+)<\/script>/)[1];
  const restored = gunzipSync(Buffer.from(payload, 'base64')).toString('utf8');
  const help = html => html.match(/<dialog\b[^>]*id="helpDialog"[\s\S]*?<\/dialog>/)[0];
  for (const html of [readable, root, restored]) { assertLock(html); assertMobileInformation(html); assert.equal(help(html), help(source)); }
  assert.equal(root, readable); assert.equal(restored, readable);
});

function assertMobileInformation(html) {
  const mobile = html.match(/@media \(max-width: 860px\) \{([\s\S]*?)@media \(max-width: 640px\)/)?.[1];
  assert.match(mobile || '', /footer\s*\{\s*display:\s*none;?\s*\}/);
  const help = html.match(/<dialog\b[^>]*id="helpDialog"[\s\S]*?<\/dialog>/)?.[0];
  assert.match(help || '', /data-i18n="helpOffline"[\s\S]*<details class="build-details">[\s\S]*<\/details>\s*<!-- APP:HELP:END -->/);
  assert.doesNotMatch(html.match(/<main\b[\s\S]*?<\/main>/)?.[0] || '', /build-details/);
  for (const id of ['buildVersion','builtAt','dependencyCount']) assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1);
  assert.match(mobile, /\.mobile-tools-button\s*\{\s*display:inline-flex/);
}
test('mobile information moves below Help without replacing the tool picker', () => assertMobileInformation(source));
test('keyboard build-summary activation is not a backdrop click', () => {
  let closes = 0;
  const help = { close() { closes++; }, getBoundingClientRect() { return {left:10,right:300,top:10,bottom:400}; } };
  const handler = source.match(/help\.addEventListener\('click',(e=>\{[^\n]*?\})\);/)?.[1];
  assert.ok(handler);
  const click = vm.runInNewContext(`(${handler})`, {help});
  click({target:{},clientX:0,clientY:0});
  assert.equal(closes, 0, 'keyboard summary clicks must keep Help open');
  click({target:help,clientX:0,clientY:0});
  assert.equal(closes, 1, 'real outside backdrop clicks still close Help');
});

function assertHelpScrollOwner(html) {
 assert.match(html,/\.help-dialog\[open\]\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*overflow:\s*hidden;?\s*\}/);
 assert.match(html,/\.help-dialog \.dialog-header\s*\{[^}]*flex:\s*none;?\s*\}/);
 assert.match(html,/\.help-dialog \.dialog-body\s*\{[^}]*min-height:\s*0;[^}]*max-height:\s*none;?\s*\}/);
 // The body must shrink within the 760px dialog cap even at a 900px viewport,
 // where its older independent viewport minus 100 limit was 800px.
 assert.match(html,/\.dialog-body\s*\{[^}]*overflow:\s*auto;/);
}
test('Help reserves its header inside the dialog cap and gives remaining height to one scroll owner',()=>{
 const wrapper=read('dist/index.self-extract.html'),payload=wrapper.match(/<script id="self-extract-payload"[^>]*>([A-Za-z0-9+/=\r\n]+)<\/script>/)[1];
 for(const html of [source,read('dist/index.html'),read('developer-toolbox.html'),gunzipSync(Buffer.from(payload,'base64')).toString('utf8')])assertHelpScrollOwner(html);
});
