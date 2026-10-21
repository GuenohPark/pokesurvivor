'use strict';
// Git supplies the previous push's release baseline. No network or publishing API.
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const VERSION_KEYS = ['version', 'browserScriptVersion', 'chromeExtensionVersion', 'autoLoaderVersion'];
function parseVersion(value) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) throw Error('Expected stable x.y.z version: ' + value);
  const parts = value.split('.').map(Number);
  if (parts.some(n => !Number.isSafeInteger(n))) throw Error('Unsafe version: ' + value);
  return parts;
}
function compareVersions(a, b) {
  const aa = parseVersion(a), bb = parseVersion(b);
  for (let i = 0; i < 3; i++) if (aa[i] !== bb[i]) return aa[i] > bb[i] ? 1 : -1;
  return 0;
}
function maximum(values) { return values.filter(Boolean).reduce((a, b) => compareVersions(a, b) >= 0 ? a : b, '0.0.0'); }
function nextPatch(version) {
  const [major, minor, patch] = parseVersion(version);
  if (!Number.isSafeInteger(patch + 1)) throw Error('Patch version overflow');
  return [major, minor, patch + 1].join('.');
}
function selectVersion(requested, baseline, changed) {
  parseVersion(requested);
  if (compareVersions(requested, baseline) > 0) return requested;
  return changed ? nextPatch(baseline) : baseline;
}
function isRuntimePath(file) {
  // Static site stamping does not change any installed runtime.
  if (file === 'scripts/build-site.cjs') return false;
  return /^(?:src|assets|data|licenses)\//.test(file) ||
    /^scripts\/(?:build[^/]*|import[^/]*|package-extension|bundle-common)\.cjs$/.test(file) ||
    /^extension\/(?:extension-content\.js|manifest\.json)$/.test(file) ||
    // Chrome ZIPs contain the entire directory, including docs/tests/notices.
    // Any human-authored change needs a fresh immutable archive version.
    /^chrome-extension\//.test(file);
}
function packageRuntimeConfig(pkg) {
  return JSON.stringify({build: pkg.scripts?.build, browser: pkg.scripts?.['build:browser'], chrome: pkg.scripts?.['build:chrome'], dependencies: pkg.dependencies, devDependencies: pkg.devDependencies});
}
function planRelease({changedPaths, requested, previous = {}, released = {}}) {
  const baseline = {};
  for (const key of VERSION_KEYS) baseline[key] = maximum([previous[key], released[key]]);
  const explicitRelease = VERSION_KEYS.some(key => compareVersions(requested[key], baseline[key]) > 0);
  const runtimeChanged = changedPaths.some(isRuntimePath) ||
    (changedPaths.includes('package.json') && packageRuntimeConfig(requested) !== packageRuntimeConfig(previous));
  const versions = {};
  versions.version = selectVersion(requested.version, baseline.version, runtimeChanged);
  const bundleChanged = runtimeChanged || versions.version !== baseline.version;
  versions.browserScriptVersion = selectVersion(requested.browserScriptVersion, baseline.browserScriptVersion, bundleChanged);
  versions.chromeExtensionVersion = selectVersion(requested.chromeExtensionVersion, baseline.chromeExtensionVersion,
    bundleChanged || versions.browserScriptVersion !== baseline.browserScriptVersion);
  versions.autoLoaderVersion = selectVersion(requested.autoLoaderVersion, baseline.autoLoaderVersion,
    changedPaths.some(file => /^src\/auto-loader[^/]*\.js$/.test(file)));
  return {versions, baseline, runtimeChanged, changed: runtimeChanged || explicitRelease};
}
const GENERATED = [
  'dist/pokesurvivor.user.js', 'dist/pokesurvivor.meta.js', 'dist/pokesurvivor-build.json', 'site/index.html',
  ...['auto', 'menu', 'browser'].flatMap(name => ['user', 'meta'].map(kind => 'dist/pokesurvivor-ko-' + name + '.' + kind + '.js')),
  ...['auto', 'menu'].flatMap(name => ['user', 'meta'].map(kind => 'pokesurvivor-ko-' + name + '.' + kind + '.js')),
  'extension/extension-main.js', 'extension/extension-background.js', 'extension/pokesurvivor-ko-menu.user.js',
  'extension/manifest.json', 'extension/LICENSE', 'extension/THIRD-PARTY-NOTICES.md',
  'extension/licenses/GAME-LICENSE-NONCOMMERCIAL.md', 'extension/licenses/Galmuri-LICENSE.txt', 'extension/licenses/PokeAPI-LICENSE.md',
  'chrome-extension/content-main.js', 'chrome-extension/manifest.json', 'chrome-extension/LICENSE', 'chrome-extension/TEST-REPORT.json',
  'data/tier-model.json', 'data/tier-ui.json', 'data/move-ui.json', 'dist/pokesurvivor-full-upgrade-stats.csv',
  'dist/pokesurvivor-ko-desktop-extension.zip', 'dist/pokesurvivor-ko-chrome-extension.zip'
];
function generatedFiles(versions) {
  parseVersion(versions.chromeExtensionVersion);
  return ['package.json', ...GENERATED,
    'dist/pokesurvivor-ko-chrome-extension-' + versions.chromeExtensionVersion + '-test.zip',
    'dist/pokesurvivor-ko-chrome-extension-' + versions.chromeExtensionVersion + '-test.sha256'];
}
function isGeneratedPath(file) {
  return GENERATED.includes(file) || /^dist\/pokesurvivor-ko-chrome-extension-\d+\.\d+\.\d+-test\.(?:zip|sha256)$/.test(file);
}
function isProtectedArtifact(file) {
  return /^android\//.test(file) ||
    (/^dist\/.*\.(?:zip|apk|sha256)$/.test(file) && !['dist/pokesurvivor-ko-desktop-extension.zip', 'dist/pokesurvivor-ko-chrome-extension.zip'].includes(file));
}
function git(...args) { return execFileSync('git', args, {cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim(); }
function previousText(ref, file) {
  try { return git('show', ref + ':' + file); } catch (error) {
    if (!git('ls-tree', ref, '--', file)) return null;
    throw error;
  }
}
function metaVersion(text) { return text?.match(/^\/\/ @version\s+(\S+)/m)?.[1]; }
function releasedVersions(ref, previous) {
  const meta = file => metaVersion(previousText(ref, file));
  const manifest = previousText(ref, 'chrome-extension/manifest.json');
  return {
    version: maximum([previous.version, meta('dist/pokesurvivor.meta.js'), meta('dist/pokesurvivor-ko-menu.meta.js')]),
    browserScriptVersion: maximum([previous.browserScriptVersion, meta('dist/pokesurvivor-ko-browser.meta.js')]),
    chromeExtensionVersion: maximum([previous.chromeExtensionVersion, manifest && JSON.parse(manifest).version]),
    autoLoaderVersion: maximum([previous.autoLoaderVersion, meta('dist/pokesurvivor-ko-auto.meta.js')])
  };
}
function resolveBase(event, eventName) {
  // Pushes can contain many commits: HEAD^ would miss earlier runtime changes.
  const before = eventName === 'push' ? event.before : process.env.RELEASE_BASE;
  if (before && !/^0+$/.test(before)) {
    if (!/^[a-f0-9]{40,64}$/i.test(before)) throw Error('Invalid release base revision');
    git('cat-file', '-e', before + '^{commit}'); // Fail closed on missing history.
    return before;
  }
  if (eventName === 'push') return null; // First push: all inputs are new.
  const release = git('log', '-1', '--format=%H', '--grep=^chore(release):');
  // Before the first CI release, a manual run validates committed artifacts.
  // Treating every historical input as new would bump every manual validation.
  return release || git('rev-parse', 'HEAD');
}
function stageGenerated() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const files = generatedFiles(pkg).filter(file => fs.existsSync(path.join(ROOT, file)));
  // An existing versioned archive must never be replaced, including Store/APKs.
  for (const file of git('diff', '--name-only', '--diff-filter=M', 'HEAD').split('\n')) {
    if (isProtectedArtifact(file))
      throw Error('Build modified a protected existing artifact: ' + file);
  }
  if (files.length) git('add', '--', ...files);
  console.log('Staged only explicit generated release files.');
}
function main() {
  if (process.argv.includes('--stage-generated')) return stageGenerated();
  const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : {};
  const ref = resolveBase(event, process.env.GITHUB_EVENT_NAME);
  const requested = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const previous = ref ? JSON.parse(previousText(ref, 'package.json') || '{}') : {};
  const changedPaths = (ref ? git('diff', '--name-only', '--no-renames', ref, 'HEAD') : git('ls-files')).split('\n').filter(Boolean);
  const released = ref ? releasedVersions(ref, previous) : {};
  const plan = planRelease({changedPaths, requested, previous, released});
  const generatedOnly = changedPaths.length > 0 && changedPaths.every(isGeneratedPath);
  // Human pushes always validate, even if every changed path is generated.
  // Manifests and bundled code are also security-relevant authoring inputs.
  // The workflow's bot exclusion and [skip ci] commit marker prevent loops.
  {
    fs.writeFileSync(path.join(ROOT, 'package.json'), JSON.stringify({...requested, ...plan.versions}, null, 2) + '\n');
    const manifestPath = path.join(ROOT, 'chrome-extension/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.version = plan.versions.chromeExtensionVersion;
    if (manifest.version_name) manifest.version_name = manifest.version + '-test · com 전용 · 패치' + plan.versions.version;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  }
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT,
    'should_build=true\nversion=' + plan.versions.version + '\nchrome_version=' + plan.versions.chromeExtensionVersion + '\n');
  console.log(JSON.stringify({...plan, base: ref, generatedOnly}, null, 2));
}
module.exports = {parseVersion, compareVersions, nextPatch, planRelease, isRuntimePath, generatedFiles, isGeneratedPath, isProtectedArtifact};
if (require.main === module) main();
