import fs from 'node:fs';
import { createRequire } from 'node:module';
const BrowserKittyUI=createRequire(import.meta.url)('../components/ui-conventions.js');
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

// Execute the production navigation functions and event wiring with a deterministic
// DOM/history seam. These tests do not claim native browser or IME coverage.
const source = fs.readFileSync(process.env.APP_HTML || new URL('../src/index.template.html', import.meta.url), 'utf8');
function extract(name) {
  const start = source.search(new RegExp('    (?:async )?function ' + name + '\\('));
  assert.notEqual(start, -1, `Production function ${name}`);
  const ends = ['\n    async function ', '\n    function ', '\n    const ', '\n    let ', "\n    $('#"].map(marker => source.indexOf(marker, start + 1)).filter(end => end >= 0);
  return source.slice(start, Math.min(...ends));
}
const toolDefinitions = source.slice(source.indexOf('    const tools = ['), source.indexOf('\n    function toolDescription'));
const aliasDefinitions = source.slice(source.indexOf('    const toolAliases = {'), source.indexOf('\n    function toolAliasText'));
const seedDefinitions = source.split('\n').find(line => line.startsWith('    const seedSelectors='));
const names = ['clearCryptoError','setCryptoError','persistFavorites','loadFavorites','renderUiStatus','translateWorkspace','resetFavorites','initHash','initHmac','setupCopyButton','copyText','toolDescription', 'toolAliasText', 'toolSearchScore', 'toolSearchMatch', 'starSvg', 'toolRow', 'renderToolList', 'refreshToolBrowsers', 'toggleFavorite', 'updateWorkspaceFavorite', 'captureWorkspaceState', 'saveCurrentToolState', 'restoreWorkspaceState', 'applyPendingSeed', 'renderCurrentTool', 'resetPickerMode', 'openToolPicker', 'openTransferPicker', 'setKeyboardSelection', 'handleSearchKeydown', 'openTool', 'normalizedResult', 'applyLanguage', 'readStorage', 'writeStorage', 'readJson'];
function harness({ favorites = [], language = 'en' } = {}) {
  const nodes = new Map(), pushes = [], writes = [], storage = new Map(), windowEvents = {}, documentEvents = {}, opens = [];
  let fields = [], rowSequence = 0;
  function node(id) {
    if (nodes.has(id)) return nodes.get(id);
    const classes = new Set(), events = new Map();
    let html = '', rows = [], stars = [];
    const n = { id: id.replace(/^#/, ''), value: '', dataset: {}, type: 'text', checked: false, open: false, scrolls: 0, files:[], isConnected:true, disabled:false,
      removeAttribute(key){delete this[key];},
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
    activeOutputObserver:null, BrowserKittyUI, favoritesLocked:false, favoritesFailure:null, favoritesDirty:false, favoritesGeneration:0, languageFailure:false, copyFailure:null, workspaceMounted:true, previousLanguage:language, AppConfirm:{refresh(){}}, favorites, language, currentToolId: 'base64', pendingSeed: null, pickerMode: 'open', transferGetter: null,
    toolSessionState: new Map(), keyboardSelection: new Map([['toolList', -1], ['pickerList', -1]]),
    icons: new Proxy({}, { get: () => '' }), t: key => key, escapeHtml: text => String(text),
    APP_CONFIG: { name: 'Developer Toolbox', slug: 'httpapps-developer-toolbox' }, storageKeys: { language: 'httpapps-developer-toolbox:language', favorites: 'httpapps-developer-toolbox:favorites' },
    $: node, $$: selector => selector.startsWith('#workspaceBody') ? fields : [],
    document: { documentElement: {}, getElementById: id => fields.find(field => field.id === id), addEventListener: (type, fn) => { documentEvents[type] = fn; } },
    window: { addEventListener: (type, fn) => { windowEvents[type] = fn; } },
    location: { hash: '#base64' }, history: { pushState(a, b, hash) { pushes.push(hash); context.location.hash = hash; } },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { writes.push([key, value]); storage.set(key, value); } },
    TextEncoder, Uint8Array, crypto:{subtle:null}, formatBytes:n=>String(n),
    Event: class { constructor(type) { this.type = type; } }, requestAnimationFrame: fn => fn(), scrollToWorkspaceHeader() {}, showToast() {}, renderSmartSuggestions() {}, initTool(id) { opens.push(id); }
  };
  for (const match of toolDefinitions.matchAll(/id:'([^']+)'[^\n]+render:(\w+)/g)) context[match[2]] = () => match[1];
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('    const translations = {'),source.indexOf('    const icons = {')) + '\n' + toolDefinitions + '\n' + aliasDefinitions + '\n' + seedDefinitions + '\n' + names.map(extract).join('\n') + '\nthis.seedSelectorsForTest=seedSelectors;', context);
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


for (const lang of ['ja', 'en']) {
  test(`${lang} header uses localized EN/JA destination controls and accurate privacy/help labels`, () => {
    const h = harness({ language: lang });
    const translations = source.slice(source.indexOf('    const translations = {'), source.indexOf('    const icons = {'));
    h.run(extract('t'));
    const privacy = h.node('#privacyForTest'), helpTitle = h.node('#helpTitleForTest');
    privacy.dataset.i18n = 'localOnly'; helpTitle.dataset.i18n = 'helpTitle';
    const originalQuery = h.context.$$;
    h.context.$$ = selector => selector === '[data-i18n]' ? [privacy, helpTitle] : originalQuery(selector);
    h.node('#base64Input').value = '日本語 😀 draft';
    h.run('applyLanguage()');
    const destination = lang === 'ja' ? '英語に切り替え' : 'Switch to Japanese';
    assert.deepEqual({
      label: h.node('#languageButton').textContent, aria: h.node('#languageButton')['aria-label'],
      title: h.node('#languageButton').title, privacy: privacy.textContent, help: helpTitle.textContent
    }, {
      label: lang === 'ja' ? 'EN' : 'JA', aria: destination, title: destination,
      privacy: lang === 'ja' ? '完全ローカル処理' : 'Fully local processing',
      help: lang === 'ja' ? '使い方と注意事項' : 'How to use & notes'
    });
    assert.equal(h.node('#base64Input').value, '日本語 😀 draft');
    assert.deepEqual(h.writes, []);
  });
}

test('favorites storage failure retains current list, survives language render and retries exact IDs',()=>{
 const h=harness();const set=h.context.localStorage.setItem;h.context.localStorage.setItem=()=>{throw Error('quota')};
 h.run("toggleFavorite('json')");assert.deepEqual([...h.context.favorites],['json']);assert.equal(h.context.favoritesFailure,'write');assert.equal(h.node('#retryFavorites').hidden,false);
 h.context.language='ja';h.run('applyLanguage()');assert.equal(h.context.favoritesFailure,'write');assert.deepEqual(h.writes,[]);
 h.context.localStorage.setItem=set;h.run('persistFavorites()');assert.equal(h.context.favoritesFailure,null);assert.equal(h.storage.get('httpapps-developer-toolbox:favorites'),'["json"]');
});
test('corrupt saved favorites cannot be silently overwritten by a toggle or language render',()=>{
 const h=harness();h.storage.set('httpapps-developer-toolbox:favorites','{broken');h.run('favorites=loadFavorites()');h.run("toggleFavorite('json');applyLanguage()");
 assert.equal(h.context.favoritesFailure,'read');assert.equal(h.storage.get('httpapps-developer-toolbox:favorites'),'{broken');assert.deepEqual(h.writes,[]);
});
test('reset Cancel retains data, pending confirmation locks mutations, and failed delete retains old list',async()=>{
 const h=harness({favorites:['json']});let answer;h.context.AppConfirm.ask=()=>new Promise(r=>{answer=r});
 const pending=h.run('resetFavorites()');h.run("toggleFavorite('csv')");assert.deepEqual([...h.context.favorites],['json']);answer(false);await pending;assert.deepEqual([...h.context.favorites],['json']);assert.deepEqual(h.writes,[]);
 h.context.localStorage.setItem=()=>{throw Error('denied')};const deletion=h.run('resetFavorites()');answer(true);await deletion;assert.deepEqual([...h.context.favorites],['json']);assert.equal(h.context.favoritesFailure,'write');
});
test('reset removes only favorites; shared language and tool inputs survive',async()=>{
 const h=harness({favorites:['json']});h.storage.set(BrowserKittyUI.languageKey,'ja');h.node('#base64Input').value='secret';h.context.AppConfirm.ask=async()=>true;await h.run('resetFavorites()');
 assert.equal(h.storage.get('httpapps-developer-toolbox:favorites'),'[]');assert.equal(h.storage.get(BrowserKittyUI.languageKey),'ja');assert.equal(h.node('#base64Input').value,'secret');assert.equal(h.node('#resetPersonalization').focused,true);
});
test('language refresh preserves result/file nodes and does not restart in-flight work or write storage',()=>{
 const h=harness();const file=h.node('#base64File'),result=h.node('#base64Output');file.files=[{name:'private.bin'}];result.textContent='exact random output';h.node('#base64Input').value='draft';h.context.language='ja';h.run('applyLanguage()');
 assert.strictEqual(h.node('#base64File'),file);assert.equal(file.files[0].name,'private.bin');assert.equal(result.textContent,'exact random output');assert.deepEqual(h.opens,[]);assert.deepEqual(h.writes,[]);
});
test('hash captures algorithm and input, prevents double submit, rejects edited-source completion and preserves old result on failure',async()=>{
 const h=harness();let digestResolve,calls=[];h.context.crypto.subtle={digest:(alg,data)=>{calls.push([alg,Buffer.from(data).toString()]);return new Promise(r=>digestResolve=r)}};
 h.node('#hashText').value='first';h.node('#hashAlgorithm').value='SHA-256';h.node('#hashOutput').textContent='old';h.run('initHash()');const run=h.node('#hashCalculate').onclick;
 const pending=run();await run();assert.equal(calls.length,1);assert.equal(h.node('#hashCalculate').disabled,true);h.node('#hashText').value='second';h.node('#hashText').emit('input');digestResolve(new Uint8Array([255]).buffer);await pending;
 assert.deepEqual(calls,[['SHA-256','first']]);assert.equal(h.node('#hashOutput').textContent,'old');assert.equal(h.node('#hashCalculate').disabled,false);
 h.context.crypto.subtle.digest=async()=>{throw Error('digest rejected')};await run();assert.equal(h.node('#hashOutput').textContent,'old');assert.match(h.node('#hashStatus').textContent,/processingFailed/);
});
test('HMAC captures message before import resolves and ignores edits during asynchronous work',async()=>{
 const h=harness();let importResolve,signed=[];h.context.crypto.subtle={importKey:()=>new Promise(r=>importResolve=r),sign:async(_,key,data)=>{signed.push(Buffer.from(data).toString());return new Uint8Array([1]).buffer}};
 h.node('#hmacInput').value='original';h.node('#hmacKey').value='secret';h.node('#hmacAlgorithm').value='SHA-256';h.node('#hmacOutput').textContent='previous';h.run('initHmac()');h.node('#hmacInput').value='new';h.node('#hmacInput').emit('input');importResolve({});await new Promise(r=>setImmediate(r));
 assert.deepEqual(signed,['original']);assert.equal(h.node('#hmacOutput').textContent,'previous');assert.equal(h.node('#hmacRun').disabled,false);
});
test('clipboard fallback removes textarea after thrown copy, restores only owned focus, and keeps persistent recovery',async()=>{
 const h=harness();let removed=0;const prior=h.node('#base64Input');h.context.document.activeElement=prior;h.context.navigator={clipboard:{writeText:async()=>{throw Error('clipboard denied')}}};
 h.context.document.createElement=()=>({style:{},focus(){h.context.document.activeElement=this},select(){},remove(){removed++}});h.context.document.body={append(){}};h.context.document.execCommand=()=>{throw Error('copy denied')};
 await h.run("copyText('snapshot')");assert.equal(removed,1);assert.equal(prior.focused,true);assert.equal(h.context.copyFailure,'snapshot');assert.equal(h.node('#retryCopy').hidden,false);
 prior.focused=false;h.context.document.activeElement=prior;h.context.document.execCommand=()=>{h.context.document.activeElement=h.node('#helpButton');return false};await h.run("copyText('next')");assert.equal(removed,2);assert.equal(prior.focused,false);
});
test('language resolution honors URL, common, legacy and ordered browser choices without writes',()=>{
 const h=harness();h.storage.set('legacy','ja');const opts={url:'https://example.test/?lang=en',storage:h.context.localStorage,legacyKeys:['legacy'],languages:['fr','ja-JP','en-US']};
 assert.equal(BrowserKittyUI.resolveLanguage(opts),'en');opts.url='https://example.test/?lang=wrong';assert.equal(BrowserKittyUI.resolveLanguage(opts),'ja');h.storage.set(BrowserKittyUI.languageKey,'en');assert.equal(BrowserKittyUI.resolveLanguage(opts),'en');h.storage.clear();assert.equal(BrowserKittyUI.resolveLanguage(opts),'ja');assert.deepEqual(h.writes,[]);
});

test('delayed clipboard rejection restores fallback-time focus after the user moved away from Copy',async()=>{
 const h=harness();let reject;h.context.navigator={clipboard:{writeText:()=>new Promise((_,r)=>reject=r)}};const first=h.node('#copyCsvButton'),later=h.node('#helpButton');first.focus=()=>h.context.document.activeElement=first;later.focus=()=>h.context.document.activeElement=later;first.focus();let removed=0;
 h.context.document.body={append(){}};h.context.document.createElement=()=>({style:{},focus(){h.context.document.activeElement=this},select(){},remove(){removed++}});h.context.document.execCommand=()=>false;
 const pending=h.run("copyText('snapshot')");later.focus();reject(Error('denied'));await pending;assert.strictEqual(h.context.document.activeElement,later);assert.equal(removed,1);
});
for(const [init,button,statusId,inputId] of [['initHash','#hashCalculate','#hashStatus','#hashText'],['initHmac','#hmacRun','#hmacStatus','#hmacInput']])test(`${init} persistent failure relocalizes to JA while retaining raw engine detail and current work`,async()=>{
 const h=harness();h.run(extract('t'));h.node(inputId).value='retain secret';h.node('#hashAlgorithm').value='SHA-256';h.node('#hmacAlgorithm').value='SHA-256';h.node('#hmacKey').value='key';h.context.crypto.subtle={digest:async()=>{throw Error('engine detail')},importKey:async()=>{throw Error('engine detail')}};h.run(init+'()');if(init==='initHash')await h.node(button).onclick();else await new Promise(r=>setImmediate(r));
 const status=h.node(statusId);assert.match(status.textContent,/Processing failed/);status.childNodes=[{nodeType:3,get textContent(){return status.textContent},set textContent(v){status.textContent=v}}];status.hasAttribute=()=>false;h.node('#workspaceBody').querySelectorAll=()=>[status];h.context.language='ja';h.run("translateWorkspace('en')");assert.match(status.textContent,/処理できません/);assert.match(status.textContent,/engine detail/);assert.equal(h.node(inputId).value,'retain secret');
});
for(const [init,button,statusId,inputId] of [['initHash','#hashCalculate','#hashStatus','#hashText'],['initHmac','#hmacRun','#hmacStatus','#hmacInput']])test(`${init} known Web Crypto unavailability is keyed and fully relocalizes rather than becoming raw engine detail`,async()=>{
 const h=harness();h.run(extract('t'));h.node(inputId).value='retained';h.context.crypto.subtle=null;h.run(init+'()');if(init==='initHash')await h.node(button).onclick();else await new Promise(r=>setImmediate(r));const status=h.node(statusId);assert.equal(status.dataset.cryptoDetailKey,'hashUnavailable');assert.match(status.textContent,/Web Crypto/);status.childNodes=[];h.node('#workspaceBody').querySelectorAll=()=>[status];h.context.language='ja';h.run("translateWorkspace('en')");assert.match(status.textContent,/処理できません/);assert.equal(status.textContent,h.run("t('processingFailed')+' '+t('hashUnavailable')"));assert.equal(h.node(inputId).value,'retained');h.context.language='en';h.run("translateWorkspace('ja')");assert.equal(status.textContent,h.run("t('processingFailed')+' '+t('hashUnavailable')"));
});
test('Hash empty-input validation clears old crypto markers before language refresh',async()=>{
 const h=harness();h.run(extract('t'));h.node('#hashText').value='before';h.context.crypto.subtle=null;h.run('initHash()');await h.node('#hashCalculate').onclick();const status=h.node('#hashStatus');assert.equal(status.dataset.cryptoFailure,'true');h.node('#hashText').value='';h.node('#hashText').emit('input');await h.node('#hashCalculate').onclick();assert.equal(status.dataset.cryptoFailure,undefined);assert.equal(status.dataset.cryptoDetailKey,undefined);assert.equal(status.textContent,h.run("t('hashEmpty')"));status.childNodes=[{nodeType:3,get textContent(){return status.textContent},set textContent(v){status.textContent=v}}];status.hasAttribute=()=>false;h.node('#workspaceBody').querySelectorAll=()=>[status];h.context.language='ja';h.run("translateWorkspace('en')");assert.equal(status.textContent,h.run("t('hashEmpty')"));
});
