import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

// Execute the production navigation functions and event wiring with a deterministic
// DOM/history seam. These tests do not claim native browser or IME coverage.
const source = fs.readFileSync(process.env.APP_HTML || new URL('../src/index.template.html', import.meta.url), 'utf8');
function extract(name) {
  const start = source.indexOf('    function ' + name + '(');
  assert.notEqual(start, -1, `Production function ${name}`);
  const ends = ['\n    function ', '\n    const ', '\n    let ', "\n    $('#"].map(marker => source.indexOf(marker, start + 1)).filter(end => end >= 0);
  return source.slice(start, Math.min(...ends));
}
const toolDefinitions = source.slice(source.indexOf('    const tools = ['), source.indexOf('\n    function toolDescription'));
const aliasDefinitions = source.slice(source.indexOf('    const toolAliases = {'), source.indexOf('\n    function toolAliasText'));
const seedDefinitions = source.split('\n').find(line => line.startsWith('    const seedSelectors='));
const names = ['toolDescription', 'toolAliasText', 'toolSearchScore', 'toolSearchMatch', 'starSvg', 'toolRow', 'renderToolList', 'refreshToolBrowsers', 'toggleFavorite', 'updateWorkspaceFavorite', 'captureWorkspaceState', 'saveCurrentToolState', 'restoreWorkspaceState', 'applyPendingSeed', 'renderCurrentTool', 'resetPickerMode', 'openToolPicker', 'openTransferPicker', 'setKeyboardSelection', 'handleSearchKeydown', 'openTool', 'normalizedResult', 'applyLanguage', 'readStorage', 'writeStorage', 'readJson'];
function harness({ favorites = [], language = 'en' } = {}) {
  const nodes = new Map(), pushes = [], writes = [], storage = new Map(), windowEvents = {}, documentEvents = {}, opens = [];
  let fields = [], rowSequence = 0;
  function node(id) {
    if (nodes.has(id)) return nodes.get(id);
    const classes = new Set(), events = new Map();
    let html = '', rows = [], stars = [];
    const n = { id: id.replace(/^#/, ''), value: '', dataset: {}, type: 'text', checked: false, open: false, scrolls: 0,
      classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle(c, on = !classes.has(c)) { on ? classes.add(c) : classes.delete(c); } },
      setAttribute(key, value) { this[key] = value; },
      addEventListener(type, fn) { const list = events.get(type) || []; list.push(fn); events.set(type, list); },
      emit(type, extra = {}) { const e = { target: { closest: () => null }, currentTarget: this, prevented: false, preventDefault() { this.prevented = true; }, stopPropagation() {}, ...extra }; for (const fn of events.get(type) || []) fn(e); return e; },
      click() { return this.emit('click'); }, dispatchEvent(e) { this.emit(e.type); }, focus() { this.focused = true; }, select() { this.selected = true; },
      showModal() { this.open = true; }, close() { this.open = false; this.emit('close'); }, scrollIntoView() { this.scrolls++; },
      querySelectorAll(selector) { return selector === '[data-open-tool]' ? rows : selector === '[data-favorite-tool]' ? stars : []; },
      get innerHTML() { return html; }, set innerHTML(value) {
        html = value;
        rows = [...value.matchAll(/data-open-tool="([^"]+)"/g)].map((m, i) => { const row = node(`${id}:row:${i}:${m[1]}:${++rowSequence}`); row.dataset.openTool = m[1]; return row; });
        stars = rows.map((row, i) => { const star = node(`${id}:star:${i}:${++rowSequence}`); star.dataset.favoriteTool = row.dataset.openTool; return star; });
        if (id === '#workspaceBody') {
          const selector = context.seedSelectorsForTest[value] || `#${value}Input`;
          fields = [node(selector), node(`#${value}Mode`), node(`#${value}Checkbox`), node(`#${value}File`)];
          fields.forEach(field => { field.value = 'default'; field.checked = false; }); fields[2].type = 'checkbox'; fields[3].type = 'file';
        }
      }
    };
    nodes.set(id, n); return n;
  }
  const context = {
    favorites, language, currentToolId: 'base64', pendingSeed: null, pickerMode: 'open', transferGetter: null,
    toolSessionState: new Map(), keyboardSelection: new Map([['toolList', -1], ['pickerList', -1]]),
    icons: new Proxy({}, { get: () => '' }), t: key => key, escapeHtml: text => String(text),
    APP_CONFIG: { name: 'Developer Toolbox', slug: 'httpapps-developer-toolbox' }, storageKeys: { language: 'httpapps-developer-toolbox:language', favorites: 'httpapps-developer-toolbox:favorites' },
    $: node, $$: selector => selector.startsWith('#workspaceBody') ? fields : [],
    document: { documentElement: {}, getElementById: id => fields.find(field => field.id === id), addEventListener: (type, fn) => { documentEvents[type] = fn; } },
    window: { addEventListener: (type, fn) => { windowEvents[type] = fn; } },
    location: { hash: '#base64' }, history: { pushState(a, b, hash) { pushes.push(hash); context.location.hash = hash; } },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { writes.push([key, value]); storage.set(key, value); } },
    Event: class { constructor(type) { this.type = type; } }, requestAnimationFrame: fn => fn(), scrollToWorkspaceHeader() {}, showToast() {}, renderSmartSuggestions() {}, initTool(id) { opens.push(id); }
  };
  for (const match of toolDefinitions.matchAll(/id:'([^']+)'[^\n]+render:(\w+)/g)) context[match[2]] = () => match[1];
  vm.createContext(context);
  vm.runInContext(toolDefinitions + '\n' + aliasDefinitions + '\n' + seedDefinitions + '\n' + names.map(extract).join('\n') + '\nthis.seedSelectorsForTest=seedSelectors;', context);
  for (const marker of ["$('#toolSearch').addEventListener('input'", "$('#toolSearch').addEventListener('keydown'", "document.addEventListener('keydown'", "window.addEventListener('hashchange'"]) {
    vm.runInContext(source.split('\n').find(line => line.trim().startsWith(marker)), context);
  }
  node('#toolPickerDialog').addEventListener('close', () => vm.runInContext('resetPickerMode()', context));
  const run = code => vm.runInContext(code, context);
  run('renderCurrentTool();refreshToolBrowsers()'); opens.length = 0;
  const searchFor = id => node(id === 'toolList' ? '#toolSearch' : '#pickerSearch');
  return { context, node, run, pushes, opens, writes, storage, windowEvents, documentEvents,
    fields: () => fields, rows: id => node('#' + id).querySelectorAll('[data-open-tool]'),
    ids(id) { return this.rows(id).map(row => row.dataset.openTool); },
    query(id, value) { searchFor(id).value = value; searchFor(id).emit('input'); },
    key(id, key, extra = {}) { return searchFor(id).emit('keydown', { key, ...extra }); },
    index: id => context.keyboardSelection.get(id), searchFor
  };
}

for (const list of ['toolList', 'pickerList']) {
  test(`${list}: typing a nonempty query highlights the best match and Enter opens immediately`, () => {
    const h = harness(); h.query(list, 'json');
    assert.equal(h.index(list), 0); assert.equal(h.rows(list)[0].classList.contains('keyboard-active'), true);
    assert.equal(h.rows(list)[0].scrolls, 0, 'automatic highlighting must not scroll the page');
    h.key(list, 'Enter'); assert.deepEqual(h.opens, ['json']); assert.deepEqual(h.pushes, ['#json']);
  });
  test(`${list}: exact JSON ranks before a matching favorite, and search results are unique`, () => {
    const h = harness({ favorites: ['csv', 'csv', 'unknown'] }); h.query(list, '  JSON  ');
    assert.equal(h.ids(list)[0], 'json'); assert.equal(h.ids(list).filter(id => id === 'csv').length, 1);
    assert.equal(new Set(h.ids(list)).size, h.ids(list).length);
    const scores = h.ids(list).map(id => h.run(`toolSearchScore(toolMap[${JSON.stringify(id)}],'json')`));
    assert.deepEqual(scores, [...scores].sort((a, b) => a - b));
  });
  test(`${list}: arrows choose alternatives and clamp at both ends`, () => {
    const h = harness(); h.query(list, 'json'); const ids = h.ids(list);
    h.key(list, 'ArrowDown'); assert.equal(h.index(list), 1); h.key(list, 'Enter'); assert.equal(h.opens.at(-1), ids[1]);
    h.query(list, 'json'); h.key(list, 'ArrowUp'); assert.equal(h.index(list), 0);
    for (let i = 0; i < ids.length + 2; i++) h.key(list, 'ArrowDown');
    assert.equal(h.index(list), ids.length - 1);
  });
  for (const query of ['', '   ', 'no-such-tool-xyz']) test(`${list}: ${JSON.stringify(query)} does not quick-open a stale result`, () => {
    const h = harness(); h.query(list, 'json'); h.key(list, 'ArrowDown'); h.query(list, query); h.key(list, 'Enter');
    assert.equal(h.index(list), -1); assert.deepEqual(h.opens, []);
    assert.ok(h.rows(list).every(row => !row.classList.contains('keyboard-active')));
  });
  test(`${list}: blank search retains favorites and categories and can be explicitly selected`, () => {
    const h = harness({ favorites: ['csv'] });
    assert.equal(new Set(h.ids(list)).size, 33); assert.equal(h.ids(list).filter(id => id === 'csv').length, 2);
    h.key(list, 'ArrowDown'); h.key(list, 'Enter'); assert.equal(h.opens.at(-1), 'csv');
  });
  for (const flag of [{ isComposing: true }, { keyCode: 229 }]) for (const key of ['Enter', 'ArrowDown', 'ArrowUp', 'Escape']) {
    test(`${list}: ${JSON.stringify(flag)} ${key} preserves query, selection, and navigation`, () => {
      const h = harness(); h.query(list, 'json'); h.run(`setKeyboardSelection($('#${list}'),1)`);
      const before = h.ids(list), e = h.key(list, key, flag);
      assert.deepEqual(h.opens, []); assert.deepEqual(h.pushes, []); assert.equal(h.searchFor(list).value, 'json');
      assert.equal(h.index(list), 1); assert.deepEqual(h.ids(list), before); assert.equal(e.prevented, false);
    });
  }
  test(`${list}: regular typing is not suppressed`, () => {
    const h = harness(); h.query(list, 'json'); const e = h.key(list, 'a');
    assert.equal(e.prevented, false); assert.deepEqual(h.opens, []);
  });
}

test('Japanese aliases and existing URL relevance order remain searchable', () => {
  const h = harness({ language: 'ja' });
  assert.ok(h.run("toolSearchMatch(toolMap.regex,'正規表現')")); assert.ok(h.run("toolSearchMatch(toolMap.base64,'ベース64')"));
  h.query('toolList', 'url'); assert.deepEqual(h.ids('toolList'), ['url-codec', 'data-uri', 'url-parser']);
});
test('palette reopening retains quick-open selection for a retained query', () => {
  const h = harness(); h.query('pickerList', 'json');
  const e = { key: 'k', metaKey: true, preventDefault() {} }; h.documentEvents.keydown(e);
  assert.equal(h.node('#toolPickerDialog').open, true); assert.equal(h.index('pickerList'), 0);
  h.key('pickerList', 'Enter'); assert.equal(h.opens.at(-1), 'json'); assert.equal(h.node('#toolPickerDialog').open, false);
});
test('Escape clears the query before closing the palette, leaving no automatic blank selection', () => {
  const h = harness(); h.run("openToolPicker('open')"); h.query('pickerList', 'json'); const cleared = h.key('pickerList', 'Escape');
  assert.equal(cleared.prevented, true, 'suppress the native dialog-cancel default while clearing');
  assert.equal(h.searchFor('pickerList').value, ''); assert.equal(h.index('pickerList'), -1); assert.equal(h.node('#toolPickerDialog').open, true);
  h.key('pickerList', 'Enter'); assert.deepEqual(h.opens, []); h.key('pickerList', 'Escape'); assert.equal(h.node('#toolPickerDialog').open, false);
});
test('transfer quick-open searches only seed-compatible tools and transfers the exact payload', () => {
  const h = harness(); h.context.payload = ' 日本語 😀\n<&> '; h.run('openTransferPicker(()=>payload)');
  assert.equal(h.ids('pickerList').includes('random'), false); assert.equal(h.ids('pickerList').includes('uuid'), false);
  h.query('pickerList', 'uuid'); h.key('pickerList', 'Enter'); assert.deepEqual(h.opens, []);
  h.query('pickerList', 'json'); h.key('pickerList', 'Enter');
  assert.equal(h.node('#jsonInput').value, h.context.payload); assert.equal(h.context.pickerMode, 'open'); assert.deepEqual(h.writes, []);
});
test('empty transfer output cannot open a result or replace an existing draft', () => {
  const h = harness(); h.context.payload = 'valid'; h.run('openTransferPicker(()=>payload)'); h.query('pickerList', 'json');
  h.context.payload = ''; h.key('pickerList', 'Enter'); assert.deepEqual(h.opens, []); assert.equal(h.context.currentToolId, 'base64');
});
for (const flag of [{ isComposing: true }, { keyCode: 229 }]) test(`focused row ignores IME confirmation ${JSON.stringify(flag)}`, () => {
  const h = harness(); h.query('toolList', 'json'); const e = h.rows('toolList')[0].emit('keydown', { key: 'Enter', ...flag });
  assert.deepEqual(h.opens, []); assert.equal(e.prevented, false);
});
test('favorite toggling retains unique ranked results and persists only favorite IDs', () => {
  const h = harness(); h.query('toolList', 'json'); h.node('#toolList').querySelectorAll('[data-favorite-tool]')[0].click();
  assert.equal(h.ids('toolList')[0], 'json'); assert.equal(h.ids('toolList').filter(id => id === 'json').length, 1);
  assert.deepEqual(h.writes, [['httpapps-developer-toolbox:favorites', '["json"]']]);
});
test('quick navigation retains both drafts, options, and checkbox state in memory', () => {
  const h = harness(); h.node('#base64Input').value = 'Base64 draft'; h.node('#base64Mode').value = 'mode'; h.node('#base64Checkbox').checked = true;
  h.query('toolList', 'json'); h.key('toolList', 'Enter'); h.node('#jsonInput').value = 'JSON draft';
  h.query('toolList', 'base64'); h.key('toolList', 'Enter');
  assert.equal(h.node('#base64Input').value, 'Base64 draft'); assert.equal(h.node('#base64Mode').value, 'mode'); assert.equal(h.node('#base64Checkbox').checked, true);
  h.query('toolList', 'json'); h.key('toolList', 'Enter'); assert.equal(h.node('#jsonInput').value, 'JSON draft'); assert.deepEqual(h.writes, []);
  assert.equal(Object.keys(h.context.toolSessionState.get('base64')).includes('base64File'), false);
});
test('hash back/forward restores each draft without creating history entries; reopening current tool is stable', () => {
  const h = harness(); h.node('#base64Input').value = 'Base64 draft'; h.run("openTool('json')"); h.node('#jsonInput').value = 'JSON draft';
  h.context.location.hash = '#base64'; h.windowEvents.hashchange(); assert.equal(h.node('#base64Input').value, 'Base64 draft');
  h.context.location.hash = '#json'; h.windowEvents.hashchange(); assert.equal(h.node('#jsonInput').value, 'JSON draft');
  h.run("openTool('json')"); assert.equal(h.node('#jsonInput').value, 'JSON draft'); assert.deepEqual(h.pushes, ['#json']); assert.deepEqual(h.writes, []);
});
test('language refresh preserves the current draft and ranked search', () => {
  const h = harness(); h.node('#base64Input').value = '日本語 draft'; h.query('toolList', 'json'); h.context.language = 'ja'; h.run('applyLanguage()');
  assert.equal(h.node('#base64Input').value, '日本語 draft'); assert.equal(h.ids('toolList')[0], 'json'); assert.equal(h.index('toolList'), 0);
});
test('invalid or unavailable storage falls back without blocking navigation', () => {
  const h = harness(); h.storage.set('favorites', 'invalid json'); assert.equal(h.run("readJson('favorites','fallback')"), 'fallback');
  h.context.localStorage.getItem = () => { throw new Error('Unavailable'); }; assert.equal(h.run("readJson('favorites','fallback')"), 'fallback');
  h.run("openTool('json')"); assert.equal(h.context.currentToolId, 'json');
});
for (const flag of [{ isComposing: true }, { keyCode: 229 }]) for (const modifier of ['ctrlKey', 'metaKey']) {
  test(`global ${modifier}+K ignores composition ${JSON.stringify(flag)}`, () => {
    const h = harness(); h.query('pickerList', 'json'); h.run("setKeyboardSelection($('#pickerList'),1)");
    const e = { key: 'k', [modifier]: true, ...flag, prevented: false, preventDefault() { this.prevented = true; } };
    h.documentEvents.keydown(e);
    assert.equal(h.node('#toolPickerDialog').open, false); assert.equal(h.index('pickerList'), 1);
    assert.equal(h.searchFor('pickerList').value, 'json'); assert.deepEqual(h.opens, []); assert.equal(e.prevented, false);
  });
}
