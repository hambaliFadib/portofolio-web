import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { analyzeProject } from "./check-feature-boundaries.mjs";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "feature-boundary-selftest-"));
const write = async (name, content) => {
  const file = path.join(root, name);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
};
const run = async (files) => {
  await fs.rm(path.join(root, "app"), { recursive: true, force: true });
  await fs.rm(path.join(root, "features"), { recursive: true, force: true });
  await fs.rm(path.join(root, "lib"), { recursive: true, force: true });
  await fs.rm(path.join(root, "components"), { recursive: true, force: true });
  await fs.rm(path.join(root, "data"), { recursive: true, force: true });
  for (const [name, content] of Object.entries(files)) await write(name, content);
  return analyzeProject(root);
};

try {
  await write("tsconfig.json", JSON.stringify({ compilerOptions: { moduleResolution: "bundler", module: "esnext", baseUrl: ".", paths: { "@/*": ["./*"] } }, include: ["**/*.ts", "**/*.tsx"] }));

  let result = await run({
    "features/home/index.ts": "export { Home } from './home';",
    "features/home/home.ts": "import { copy } from '@/data/content'; export const Home = () => copy;",
    "app/page.tsx": "import { Home } from '@/features/home'; export default Home;",
    "data/content.ts": "export const copy = 'English';",
  });
  assert.equal(result.violations.length, 0, "allowed public imports and path aliases pass");

  result = await run({ "app/page.tsx": "import { X } from '../features/home/home';", "features/home/index.ts": "export const X = 1;", "features/home/home.ts": "export const X = 1;" });
  assert(result.violations.some((item) => item.includes("app must import home through")), "app deep import fails");

  result = await run({
    "features/theme/index.ts": "export const Theme = 1;",
    "features/theme/x.ts": "export const x = 1;",
    "features/theme/y.ts": "import type { X } from '../home/internal'; export type Y = X;",
    "features/home/index.ts": "export type { X } from './internal';",
    "features/home/internal.ts": "export type X = string;",
  });
  assert(result.violations.some((item) => item.includes("forbidden dependency theme -> home")), "type-only forbidden reverse dependency fails");
  assert(result.violations.some((item) => item.includes("cross-feature import must use")), "cross-feature deep import fails");

  result = await run({
    "features/home/index.ts": "export { A } from './a';",
    "features/home/a.ts": "import { B } from '@/features/navigation'; export const A = B;",
    "features/navigation/index.ts": "export { B } from './b';",
    "features/navigation/b.ts": "import { A } from '@/features/home'; export const B = A;",
  });
  assert(result.violations.some((item) => item.includes("feature dependency cycle: home -> navigation -> home")), "feature cycle fails with complete path");

  result = await run({
    "features/home/index.ts": "export { Home } from './home';",
    "features/home/home.ts": "export const Home = 1;",
    "lib/utils.ts": "import '@/features/home'; export const util = 1;",
  });
  assert(result.violations.some((item) => item.includes("shared utility lib may not import feature")), "lib reverse dependency fails");

  result = await run({ "features/home/index.ts": "export { X } from '@/features/theme/internal';", "features/theme/index.ts": "export const X = 1;", "features/theme/internal.ts": "export const X = 1;" });
  assert(result.violations.some((item) => item.includes("cross-feature import must use")), "re-export deep import is inspected");

  result = await run({ "features/home/index.ts": "export const X = 1;", "features/home/home.ts": "import(`./${name}.js`);" });
  assert(result.limitations.some((item) => item.includes("unresolved dynamic import expression")), "unresolved dynamic import is surfaced as limitation");

  result = await run({ "features/home/index.ts": "export const X = 1;", "features/home/home.ts": "import('@/features/theme/internal');", "features/theme/index.ts": "export const X = 1;", "features/theme/internal.ts": "export const X = 1;" });
  assert(result.violations.some((item) => item.includes("cross-feature import must use")), "statically resolvable dynamic import is inspected");

  console.log("Feature-boundary self-tests passed: 8 scenarios.");
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
