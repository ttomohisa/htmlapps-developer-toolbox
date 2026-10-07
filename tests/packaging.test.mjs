import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const root = path.resolve(import.meta.dirname, '..');

test('tracked download alias matches the newly built readable release byte-for-byte', () => {
  assert.deepEqual(fs.readFileSync(path.join(root, 'developer-toolbox.html')), fs.readFileSync(path.join(root, 'dist/index.html')));
});
test('inline JavaScript parses in source, readable release, and root download', () => {
  for (const file of ['src/index.template.html', 'dist/index.html', 'developer-toolbox.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    for (const [i, match] of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].entries()) {
      if (/type=["'](?:application\/json|text\/plain)["']/i.test(match[1])) continue;
      new vm.Script(match[2], { filename: file + ':script-' + i });
    }
  }
});


test('initial version badge matches canonical release metadata before initialization', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'app.config.json'), 'utf8'));
  for (const file of ['src/index.template.html', 'dist/index.html', 'developer-toolbox.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.equal(html.match(/id="versionBadge">v([^<]+)</)[1], config.version, file);
  }
});
