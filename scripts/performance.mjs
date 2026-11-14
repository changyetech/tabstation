// Node.js 24+：直接加载项目 TypeScript，扩展无关的算法基准，不参与测试计时断言。
import { registerHooks } from 'node:module';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
});

async function loadAlgorithms(directory) {
  const { groupByDomain } = await import(pathToFileURL(join(directory, 'grouping.ts')));
  const storage = await import(pathToFileURL(join(directory, 'storage.ts')));
  const batch =
    storage.upsertReadLaterBatch ??
    ((list, tabs, now, newId) =>
      tabs.reduce((result, tab) => storage.upsertReadLater(result, tab, now, newId()), list));
  return { groupByDomain, batch };
}

function measure(run) {
  for (let i = 0; i < 8; i++) run();
  const samples = Array.from({ length: 25 }, () => {
    const start = performance.now();
    run();
    return performance.now() - start;
  }).sort((a, b) => a - b);
  return Number(samples[Math.floor(samples.length / 2)].toFixed(3));
}

const groupedInputs = [1000, 5000].map((count) => {
  // 乘法置换提供确定的无序输入，覆盖裸域、子域与私有后缀。
  return Array.from({ length: count }, (_, i) => {
    const n = (i * 7919) % count;
    return { id: i, url: `https://v${n % 7}.site${n}.${n % 2 ? 'com' : 'github.io'}/path` };
  });
});
const list = Array.from({ length: 2000 }, (_, i) => ({
  id: `r${i}`,
  url: `https://example.com/${i}`,
  title: `Saved ${i}`,
  savedAt: 1,
}));
const tabs = Array.from({ length: 1000 }, (_, i) => ({
  url: `https://example.com/${1500 + i}#new`,
  title: `Tab ${i}`,
}));

function benchmark({ groupByDomain, batch }) {
  const results = {};
  for (const input of groupedInputs) {
    results[`group_${input.length}`] = measure(() => groupByDomain(input));
  }
  results.batch_2000_plus_1000 = measure(() => {
    let id = 0;
    batch(list, tabs, 2, () => `new${id++}`);
  });
  return results;
}

const root = fileURLToPath(new URL('../', import.meta.url));
const current = await loadAlgorithms(join(root, 'src/lib'));
const results = { node: process.version, unit: 'median ms, 25 samples after 8 warmups' };
if (process.argv.includes('--compare')) {
  // 以 HEAD 为改动前基线，在同一进程、同一数据上串行测量；仅删除本次创建的临时目录。
  const temporaryRoot = join(root, 'tmp');
  mkdirSync(temporaryRoot, { recursive: true });
  const baselineDirectory = mkdtempSync(join(temporaryRoot, 'performance-'));
  try {
    for (const name of ['grouping', 'storage', 'dedupe', 'url']) {
      const source = execFileSync('git', ['show', `HEAD:src/lib/${name}.ts`], {
        cwd: root,
        encoding: 'utf8',
      });
      writeFileSync(join(baselineDirectory, `${name}.ts`), source);
    }
    const baseline = await loadAlgorithms(baselineDirectory);
    for (const input of groupedInputs)
      assert.deepStrictEqual(current.groupByDomain(input), baseline.groupByDomain(input));
    assert.deepStrictEqual(
      current.batch(list, tabs, 2, () => 'new'),
      baseline.batch(list, tabs, 2, () => 'new'),
    );
    results.before = benchmark(baseline);
    results.after = benchmark(current);
  } finally {
    rmSync(baselineDirectory, { recursive: true, force: true });
  }
} else {
  results.current = benchmark(current);
}
process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
