'use strict';
// No builds, network, Git mutation, dependencies, or real publishing in this test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {parseVersion, compareVersions, nextPatch, planRelease, isRuntimePath, generatedFiles, isGeneratedPath, isProtectedArtifact} = require('../scripts/prepare-release.cjs');
const previous = {version: '0.4.10', browserScriptVersion: '0.1.7', chromeExtensionVersion: '0.1.7', autoLoaderVersion: '0.1.2', scripts: {build: 'node scripts/build.cjs', test: 'old'}};
const plan = (changedPaths, requested = previous, released = {}) => planRelease({changedPaths, requested, previous, released});
assert.equal(compareVersions('0.4.10', '0.4.9'), 1);
assert.equal(compareVersions('0.4.10', '0.4.10'), 0);
assert.equal(compareVersions('0.4.10', '0.5.0'), -1);
assert.equal(nextPatch('0.4.99'), '0.4.100');
for (const bad of ['1.2', 'v1.2.3', '1.2.3-beta', '01.2.3', '1.2.3\n', '1.2.-1', '9007199254740992.1.0', null]) assert.throws(() => parseVersion(bad));
assert.throws(() => nextPatch('1.2.9007199254740991'));
for (const paths of [[], ['README.md'], ['docs/install.md', 'tests/test.cjs', 'site/index.html', '.github/workflows/build.yml'], ['scripts/prepare-release.cjs'], ['scripts/build-site.cjs', 'site/index.template.html', 'site/index.html']]) {
  const result = plan(paths);
  assert.equal(result.runtimeChanged, false);
  assert.equal(result.changed, false);
  for (const key of ['version', 'browserScriptVersion', 'chromeExtensionVersion', 'autoLoaderVersion']) assert.equal(result.versions[key], previous[key]);
}
const testsOnly = {...previous, scripts: {...previous.scripts, test: 'node tests/test-release.cjs'}};
assert.equal(plan(['package.json', 'tests/test-release.cjs'], testsOnly).versions.version, '0.4.10');
for (const file of ['src/runtime-core.js', 'data/dictionary.ko.json', 'assets/font-install.js', 'scripts/build.cjs', 'scripts/build-browser.cjs', 'scripts/build-unified.cjs', 'scripts/bundle-common.cjs', 'scripts/import-tier-model.cjs', 'scripts/package-extension.cjs', 'chrome-extension/popup.html', 'chrome-extension/manifest.json', 'chrome-extension/content-main.js', 'chrome-extension/README.md', 'chrome-extension/README-KO.md', 'chrome-extension/tests.cjs', 'chrome-extension/TEST-REPORT.json', 'chrome-extension/LICENSE', 'chrome-extension/THIRD-PARTY-NOTICES.md', 'chrome-extension/icons/icon16.png', 'extension/extension-content.js']) {
  assert.equal(isRuntimePath(file), true, file);
  const result = plan([file]);
  assert.equal(result.versions.version, '0.4.11', file);
  assert.equal(result.versions.browserScriptVersion, '0.1.8', file);
  assert.equal(result.versions.chromeExtensionVersion, '0.1.8', file);
}
assert.equal(plan(['src/auto-loader-core.js']).versions.autoLoaderVersion, '0.1.3');
assert.equal(plan(['src/runtime-core.js']).versions.autoLoaderVersion, '0.1.2');
const requested = {...previous, version: '0.5.0', browserScriptVersion: '0.1.8', chromeExtensionVersion: '0.1.8'};
const manual = planRelease({changedPaths: [], requested, previous: requested, released: requested});
assert.deepEqual(manual.versions, Object.fromEntries(['version', 'browserScriptVersion', 'chromeExtensionVersion', 'autoLoaderVersion'].map(key => [key, requested[key]])), 'Manual validation of already committed artifacts must not bump');
const explicit = plan(['src/runtime-core.js', 'package.json'], requested);
assert.equal(explicit.versions.version, '0.5.0');
assert.equal(explicit.versions.browserScriptVersion, '0.1.8');
assert.equal(explicit.versions.chromeExtensionVersion, '0.1.8');
assert.equal(plan(['package.json'], {...previous, version: '0.5.0'}).versions.browserScriptVersion, '0.1.8');
const newerRelease = {version: '0.5.2', browserScriptVersion: '0.1.10', chromeExtensionVersion: '0.1.12'};
const newer = plan(['src/runtime-core.js'], requested, newerRelease);
assert.equal(newer.versions.version, '0.5.3');
assert.equal(newer.versions.browserScriptVersion, '0.1.11');
assert.equal(newer.versions.chromeExtensionVersion, '0.1.13');
assert.equal(plan(['README.md'], previous, newerRelease).versions.version, '0.5.2');
assert.deepEqual(plan(['src/runtime-core.js'], requested), plan(['src/runtime-core.js'], requested), 'Planning must be deterministic');
const files = generatedFiles(requested);
for (const required of ['package.json', 'dist/pokesurvivor.user.js', 'dist/pokesurvivor.meta.js', 'dist/pokesurvivor-build.json', 'site/index.html', 'chrome-extension/manifest.json', 'dist/pokesurvivor-ko-chrome-extension-0.1.8-test.zip']) assert.ok(files.includes(required), required);
for (const forbidden of ['android/keystore.jks', 'README.md', 'src/runtime-core.js', 'tests/test.cjs', 'dist/pokesurvivor-ko-android-test.apk', 'dist/pokesurvivor-ko-android-source.zip', 'dist/pokesurvivor-ko-chrome-extension-0.1.7-test.zip', 'dist/pokesurvivor-ko-chrome-web-store-0.1.3.zip']) assert.ok(!files.includes(forbidden), forbidden);
assert.equal(new Set(files).size, files.length);
for (const file of ['android/app/release.keystore', 'dist/pokesurvivor-ko-android-source.zip', 'dist/pokesurvivor-ko-android-test.apk', 'dist/pokesurvivor-ko-chrome-web-store-0.1.3.zip', 'dist/pokesurvivor-ko-chrome-extension-0.1.7-test.sha256']) assert.equal(isProtectedArtifact(file), true, file);
for (const file of ['dist/pokesurvivor-ko-desktop-extension.zip', 'dist/pokesurvivor-ko-chrome-extension.zip', 'dist/pokesurvivor.meta.js']) assert.equal(isProtectedArtifact(file), false, file);
assert.equal(isGeneratedPath('dist/pokesurvivor.meta.js'), true);
assert.equal(isGeneratedPath('src/runtime-core.js'), false);
assert.equal(isGeneratedPath('site/index.html'), true);
assert.equal(isGeneratedPath('site/index.template.html'), false);
// Generated status is never a reason to skip validation of human edits.
for (const file of ['chrome-extension/manifest.json', 'chrome-extension/content-main.js', 'chrome-extension/TEST-REPORT.json']) {
  assert.equal(isGeneratedPath(file), true);
  assert.equal(plan([file]).runtimeChanged, true, file);
  assert.equal(plan([file]).versions.chromeExtensionVersion, '0.1.8', file);
}
const releaseScript = fs.readFileSync(path.join(__dirname, '../scripts/prepare-release.cjs'), 'utf8');
assert.ok(releaseScript.includes("'should_build=true\\nversion='"), 'Human changes always run build and validation');
assert.ok(!releaseScript.includes('if (!generatedOnly)'), 'Generated classification must not suppress security-relevant human edits');
assert.equal(isGeneratedPath('chrome-extension/popup.html'), false);
assert.equal(isGeneratedPath('package.json'), false, 'Explicit version requests must not be skipped');
const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/build.yml'), 'utf8');
for (const required of ['name: Build and publish', 'workflow_dispatch:', 'branches: [main]', 'fetch-depth: 0', "node-version: '22'", 'npm run build', 'npm test', 'npm run test:chrome', 'contents: write', "github.actor != 'github-actions[bot]'", '[skip ci]', '--stage-generated', 'actions/upload-artifact@v4']) assert.ok(workflow.includes(required), required);
assert.ok(!/git add (?:\.|-A)|build:store|build:android|pull_request_target|--force/.test(workflow));
console.log('Release planning, monotonic versions, immutable artifact allowlist, and CI safety checks passed.');
