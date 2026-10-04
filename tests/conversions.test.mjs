import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync(process.env.APP_HTML || new URL('../src/index.template.html', import.meta.url), 'utf8');
const names = ['debounce', 'normalizedResult', 'setupCopyButton', 'swapInputOutput', 'createConversionResult', 'textToHex', 'hexToText', 'decodeUnicodeEscapes', 'utf8ToBase64', 'base64ToUtf8', 'initHex', 'initUnicode', 'initDataUri', 'initEscape', 'initUrlCodec'];
function extract(name) {
  const start = source.indexOf('    function ' + name + '(');
  if (start < 0) return '';
  const end = source.indexOf('\n    function ', start + 1);
  return source.slice(start, end < 0 ? source.length : end);
}
const action = kind => `[data-${kind}-target="dynamic"]`;
function harness(init, values = {}) {
  const nodes = new Map(), copied = [], sent = [], deferred = new Map();
  let timerId = 0;
  function node(id) {
    if (nodes.has(id)) return nodes.get(id);
    let text = '';
    const classes = new Set();
    const n = {
      id: id.replace(/^#/, ''), value: values[id] ?? '', checked: false, disabled: false, style: {}, listeners: new Map(),
      setAttribute(name, value) { this[name] = value; }, className: '', classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle(c, force) { const on = force ?? !classes.has(c); on ? classes.add(c) : classes.delete(c); } },
      addEventListener(event, cb) { const list = this.listeners.get(event) || []; list.push(cb); this.listeners.set(event, list); },
      emit(event) { for (const cb of this.listeners.get(event) || []) cb({ target: this }); },
      click() { if (this.disabled) return; this.onclick?.(); this.emit('click'); },
      get textContent() { return text; }, set textContent(v) { text = String(v); }
    };
    nodes.set(id, n); return n;
  }
  const context = { TextEncoder, TextDecoder, Uint8Array, atob, btoa, pendingSeed: null, $: node, t: s => s, showToast() {}, copyText: s => copied.push(s), openTransferPicker: getter => sent.push(getter()), setTimeout: fn => { deferred.set(++timerId, fn); return timerId; }, clearTimeout: id => deferred.delete(id) };
  vm.createContext(context); vm.runInContext(names.map(extract).join('\n'), context); vm.runInContext(init + '()', context);
  return { node, nodes, context, copied, sent, click: id => node(id).click(), flush() { while (deferred.size) { const [id, fn] = deferred.entries().next().value; deferred.delete(id); fn(); } } };
}

for (const input of ['6869zz', '68!69', '68g9', '6 8', '680x69', '0x', '68,', 'f', 'ff']) {
  test(`Hex rejects invalid input ${JSON.stringify(input)} without returning partial bytes`, () => {
    const h = harness('initHex', { '#hexInput': input });
    h.click('#hexDecode');
    assert.equal(h.node('#hexStatus').className, 'status-line error');
    assert.equal(h.node('#hexOutput').textContent, '');
    for (const kind of ['copy', 'send', 'swap']) assert.equal(h.node(action(kind)).disabled, true);
  });
}
for (const input of ['6869', '68 69', '0x68, 0X69', '68:69', '68-69', '0x6869', '68\t69\n']) {
  test(`Hex retains documented byte syntax ${JSON.stringify(input)}`, () => {
    const h = harness('initHex', { '#hexInput': input }); h.click('#hexDecode');
    assert.equal(h.node('#hexOutput').textContent, 'hi');
  });
}
for (const [init, inputId, valid, trigger, invalid, out, status] of [
  ['initHex', '#hexInput', '68 69', '#hexDecode', '6869zz', '#hexOutput', '#hexStatus'],
  ['initUnicode', '#unicodeInput', '\\u0068\\u0069', '#unicodeDecode', '\\u{110000}', '#unicodeOutput', '#unicodeStatus'],
  ['initDataUri', '#dataUriInput', 'data:text/plain,hi', '#dataUriDecode', 'invalid URI', '#dataUriOutput', '#dataUriStatus'],
  ['initEscape', '#escapeInput', '"hi"', '#escapeRun', 'broken', '#escapeOutput', '#escapeStatus'],
  ['initUrlCodec', '#urlCodecInput', '%68%69', '#urlDecode', '%E0%A4', '#urlCodecOutput', '#urlCodecStatus']
]) {
  test(`${init}: a failed conversion clears output and blocks Copy/Send/Swap, then recovers`, () => {
    const h = harness(init, { [inputId]: valid, '#escapeMode': 'json-decode' }); h.click(trigger);
    h.click(action('copy')); assert.equal(h.copied.at(-1), 'hi');
    h.node(inputId).value = invalid; h.click(trigger);
    assert.equal(h.node(status).className, 'status-line error');
    assert.equal(h.node(out).textContent, '');
    for (const kind of ['copy', 'send', 'swap']) { assert.equal(h.node(action(kind)).disabled, true); h.click(action(kind)); }
    assert.equal(h.copied.length, 1); assert.equal(h.sent.length, 0); assert.equal(h.node(inputId).value, invalid);
    h.node(inputId).value = valid; h.click(trigger); h.click(action('send'));
    assert.equal(h.sent.at(-1), 'hi'); assert.equal(h.node(status).className, 'status-line');
  });
  test(`${init}: editing invalidates the old result before the live-conversion delay`, () => {
    const h = harness(init, { [inputId]: valid, '#escapeMode': 'json-decode' }); h.click(trigger);
    h.node(inputId).value = invalid; h.node(inputId).emit('input');
    assert.equal(h.node(out).textContent, '');
    for (const kind of ['copy', 'send', 'swap']) assert.equal(h.node(action(kind)).disabled, true);
    h.flush(); assert.equal(h.node(status).className, 'status-line error');
  });
}
for (const value of ['{}', '[]', '123', 'false', 'null']) test(`JSON string unescape rejects ${value}`, () => {
  const h = harness('initEscape', { '#escapeMode': 'json-decode', '#escapeInput': value });
  assert.equal(h.node('#escapeStatus').className, 'status-line error'); assert.equal(h.node('#escapeOutput').textContent, '');
});
for (const payload of ['—', ' 日本語 😀\n<&>\t ', '', 'x'.repeat(100000)]) test(`JSON string round trip preserves ${payload.length} characters`, () => {
  const h = harness('initEscape', { '#escapeMode': 'json', '#escapeInput': payload });
  const encoded = h.node('#escapeOutput').textContent; assert.equal(encoded, JSON.stringify(payload));
  h.node('#escapeMode').value = 'json-decode'; h.node('#escapeInput').value = encoded; h.click('#escapeRun');
  assert.equal(h.node('#escapeOutput').textContent, payload);
});
for (const payload of ['—', ' 日本語 😀\n<&>\t ', 'x'.repeat(100000)]) test(`Hex round trip, Copy/Send/Swap preserve ${payload.length} characters`, () => {
  const h = harness('initHex', { '#hexInput': payload }); h.click('#hexEncode');
  const encoded = h.node('#hexOutput').textContent; h.node('#hexInput').value = encoded; h.click('#hexDecode');
  h.click(action('copy')); h.click(action('send')); h.click(action('swap'));
  assert.equal(h.copied.at(-1), payload); assert.equal(h.sent.at(-1), payload); assert.equal(h.node('#hexInput').value, payload);
  assert.equal(h.node('#hexOutput').textContent, encoded);
});
for (const mode of ['base64', 'percent']) test(`Data URI ${mode} decode separates MIME and transfers only payload`, () => {
  const payload = ' 日本語 😀\n<&>\t ', mime = 'application/json;charset=utf-8';
  const encoded = mode === 'base64' ? Buffer.from(payload).toString('base64') : encodeURIComponent(payload);
  const uri = `data:${mime}${mode === 'base64' ? ';base64' : ''},${encoded}`;
  const h = harness('initDataUri', { '#dataUriInput': uri, '#dataUriMime': 'text/plain', '#dataUriMode': 'percent' });
  assert.equal(h.node('#dataUriOutput').textContent, payload);
  assert.equal(h.node('#dataUriMime').value, mime); assert.equal(h.node('#dataUriMode').value, mode);
  assert.match(h.node('#dataUriMetadata').textContent, /application\/json;charset=utf-8/);
  h.click(action('copy')); h.click(action('send')); h.click(action('swap'));
  assert.equal(h.copied.at(-1), payload); assert.equal(h.sent.at(-1), payload); assert.equal(h.node('#dataUriInput').value, payload);
  assert.equal(h.node('#dataUriMetadata').textContent, '');
  h.click('#dataUriEncode'); assert.equal(h.node('#dataUriOutput').textContent, uri);
});
test('Data URI clears metadata on errors and shows its default MIME separately', () => {
  const h = harness('initDataUri', { '#dataUriInput': 'data:,hello' });
  assert.equal(h.node('#dataUriOutput').textContent, 'hello'); assert.match(h.node('#dataUriMetadata').textContent, /text\/plain;charset=US-ASCII/);
  h.node('#dataUriInput').value = 'data:text/plain,%Q0'; h.click('#dataUriDecode');
  assert.equal(h.node('#dataUriMetadata').textContent, ''); assert.equal(h.node('#dataUriOutput').textContent, '');
});
test('URL mode is restored through the existing form-state path', () => {
  const input = 'https://example.com/a b?q=日本語';
  const h = harness('initUrlCodec', { '#urlCodecInput': input }); h.click('#urlModeFull'); h.flush();
  assert.equal(h.node('#urlCodecOutput').textContent, encodeURI(input));
  const restored = harness('initUrlCodec', { '#urlCodecInput': input, '#urlCodecMode': h.node('#urlCodecMode').value });
  assert.equal(restored.node('#urlCodecOutput').textContent, encodeURI(input));
  assert.equal(restored.node('#urlModeFull').classList.contains('active'), true);
});
test('source and optional built page contain no external runtime dependency additions', () => {
  assert.match(source, /connect-src 'none'/); assert.doesNotMatch(source, /<script[^>]+src=["']https?:/i);
});
test('shared Swap preserves a genuine em dash even if a previous swap left an empty CSS class', () => {
  const h = harness('initHex', { '#hexInput': 'hi' });
  const output = h.node('#hexOutput'); output.classList.add('empty'); output.textContent = '—';
  vm.runInContext("swapInputOutput($('#hexInput'),$('#hexOutput'))", h.context);
  assert.equal(h.node('#hexInput').value, '—');
});
test('a fresh output placeholder is empty data rather than a payload sentinel', () => {
  for (const id of ['base64Output', 'entityOutput', 'jsonOutput', 'hashOutput', 'hmacOutput']) {
    assert.doesNotMatch(source, new RegExp(`id="${id}">—</div>`));
  }
});
for (const payload of ['—', ' 日本語 😀\n<&>\t ', '']) test(`Unicode round trip preserves ${payload.length} characters`, () => {
  const h = harness('initUnicode', { '#unicodeInput': payload }); h.click('#unicodeEncode');
  const encoded = h.node('#unicodeOutput').textContent; h.node('#unicodeInput').value = encoded; h.click('#unicodeDecode');
  assert.equal(h.node('#unicodeOutput').textContent, payload);
});
for (const uri of ['data:text/plain;base64,%%%%', 'data:text/plain;base64,/w==', 'data:text/plain,%FF']) test(`Data URI rejects malformed encoded payload ${uri}`, () => {
  const h = harness('initDataUri', { '#dataUriInput': 'data:text/plain,ok' });
  h.node('#dataUriInput').value = uri; h.click('#dataUriDecode');
  assert.equal(h.node('#dataUriOutput').textContent, ''); assert.equal(h.node('#dataUriStatus').className, 'status-line error');
  for (const kind of ['copy', 'send', 'swap']) assert.equal(h.node(action(kind)).disabled, true);
});
for (const mode of ['component', 'full']) test(`URL ${mode} round trip keeps URI structure and Unicode payload`, () => {
  const payload = 'https://example.com/日本語 😀?q=a&x=1#見出し';
  const h = harness('initUrlCodec', { '#urlCodecInput': payload, '#urlCodecMode': mode }); h.click('#urlEncode');
  const encoded = h.node('#urlCodecOutput').textContent;
  h.node('#urlCodecInput').value = encoded; h.click('#urlDecode'); assert.equal(h.node('#urlCodecOutput').textContent, payload);
});

for (const [init, id, button, payload, output] of [
  ['initHex', '#hexInput', '#hexEncode', 'hi', '#hexOutput'],
  ['initUnicode', '#unicodeInput', '#unicodeEncode', 'hi', '#unicodeOutput'],
  ['initEscape', '#escapeInput', '#escapeRun', 'hi', '#escapeOutput'],
  ['initUrlCodec', '#urlCodecInput', '#urlEncode', 'a b', '#urlCodecOutput'],
  ['initDataUri', '#dataUriInput', '#dataUriEncode', 'hi', '#dataUriOutput']
]) test(`${init}: a queued live conversion cannot overwrite an explicit conversion and Swap`, () => {
  const h = harness(init, { [id]: payload, '#escapeMode': 'json', '#dataUriMime': 'text/plain', '#dataUriMode': 'percent' });
  h.node(id).emit('input'); h.click(button);
  const encoded = h.node(output).textContent; h.click(action('swap')); h.flush();
  assert.equal(h.node(id).value, encoded); assert.equal(h.node(output).textContent, payload);
});
for (const payload of ['\ufeffhi', '\ufeff', '\ufeff日本語 😀']) test(`UTF-8 decoding preserves a leading BOM in ${payload.length} characters`, () => {
  const h = harness('initHex', { '#hexInput': Buffer.from(payload).toString('hex') }); h.click('#hexDecode');
  assert.equal(h.node('#hexOutput').textContent, payload);
  const uri = harness('initDataUri', { '#dataUriInput': `data:text/plain;base64,${Buffer.from(payload).toString('base64')}` });
  assert.equal(uri.node('#dataUriOutput').textContent, payload);
});
