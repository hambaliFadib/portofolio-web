import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const FEATURE_RULES = {
  home: new Set(),
  navigation: new Set(["theme"]),
  theme: new Set(),
};
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const IGNORED_DIRS = new Set(["node_modules", ".next", ".git", "out", "build", "dist"]);

function normalized(file) {
  return file.replaceAll("\\", "/");
}

function relativeTo(root, file) {
  return normalized(path.relative(root, file));
}

function featureFor(relativePath) {
  const match = relativePath.match(/^features\/([^/]+)\//);
  return match?.[1] ?? null;
}

function isFeaturePublicEntry(relativePath, targetFeature) {
  return relativePath === `features/${targetFeature}/index.ts`;
}

function collectFiles(root, current = root, output = []) {
  for (const entry of ts.sys.readDirectory(current, [...SOURCE_EXTENSIONS], undefined, ["**/*"])) {
    output.push(path.resolve(entry));
  }
  return [...new Set(output)].filter((file) => {
    const rel = relativeTo(root, file);
    return !rel.split("/").some((part) => IGNORED_DIRS.has(part)) &&
      !rel.endsWith(".d.ts") &&
      !rel.split("/").includes("captures") &&
      !rel.split("/").includes("baseline-worktree") &&
      !rel.startsWith("screenshots-");
  });
}

function moduleSpecifiers(sourceFile) {
  const found = [];
  const add = (node, expression, kind) => {
    if (ts.isStringLiteralLike(expression)) {
      found.push({ node, specifier: expression.text, kind });
    } else {
      found.push({ node, specifier: null, kind });
    }
  };

  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier) add(node, node.moduleSpecifier, ts.isImportDeclaration(node) ? "import" : "re-export");
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      add(node, node.arguments[0], "dynamic import");
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function moduleTarget(root, tsconfig, containingFile, specifier) {
  const resolution = ts.resolveModuleName(specifier, containingFile, tsconfig.options, ts.sys).resolvedModule;
  return resolution?.resolvedFileName ? path.resolve(resolution.resolvedFileName) : null;
}

function location(sourceFile, node) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return `${line + 1}:${character + 1}`;
}

function cyclePaths(graph) {
  const cycles = new Set();
  const visited = new Set();
  const stack = [];
  const active = new Set();
  const visit = (node) => {
    if (active.has(node)) {
      const start = stack.indexOf(node);
      const cycle = [...stack.slice(start), node];
      const rotations = cycle.slice(0, -1).map((_, index, items) => [...items.slice(index), ...items.slice(0, index)]);
      const canonical = rotations.map((items) => `${items.join(" -> ")} -> ${items[0]}`).sort()[0];
      cycles.add(canonical);
      return;
    }
    if (visited.has(node)) return;
    active.add(node);
    stack.push(node);
    for (const target of graph.get(node) ?? []) visit(target);
    stack.pop();
    active.delete(node);
    visited.add(node);
  };
  for (const node of graph.keys()) visit(node);
  return [...cycles];
}

export function analyzeProject(root, compiler = ts) {
  root = path.resolve(root);
  const configPath = compiler.findConfigFile(root, compiler.sys.fileExists, "tsconfig.json");
  if (!configPath) throw new Error(`No tsconfig.json found under ${root}`);
  const configRead = compiler.readConfigFile(configPath, compiler.sys.readFile);
  if (configRead.error) throw new Error(compiler.flattenDiagnosticMessageText(configRead.error.messageText, "\n"));
  const parsed = compiler.parseJsonConfigFileContent(configRead.config, compiler.sys, path.dirname(configPath));
  const files = collectFiles(root);
  const violations = [];
  const limitations = [];
  const graph = new Map(Object.keys(FEATURE_RULES).map((name) => [name, new Set()]));

  for (const file of files) {
    const relativeSource = relativeTo(root, file);
    const sourceFeature = featureFor(relativeSource);
    const sourceArea = relativeSource.split("/")[0];
    const sourceFile = compiler.createSourceFile(file, compiler.sys.readFile(file) ?? "", compiler.ScriptTarget.Latest, true);

    for (const item of moduleSpecifiers(sourceFile)) {
      if (!item.specifier) {
        if (item.kind === "dynamic import") {
          limitations.push(`${relativeSource}:${location(sourceFile, item.node)} unresolved dynamic import expression`);
        }
        continue;
      }
      const target = moduleTarget(root, parsed, file, item.specifier);
      if (!target) {
        if (item.kind === "dynamic import") {
          limitations.push(`${relativeSource}:${location(sourceFile, item.node)} cannot resolve dynamic import ${item.specifier}`);
        }
        continue;
      }
      const relativeTarget = relativeTo(root, target);
      const targetFeature = featureFor(relativeTarget);
      const sourceLocation = `${relativeSource}:${location(sourceFile, item.node)}`;

      if (relativeTarget.startsWith("app/")) {
        if (["features", "components", "lib", "data"].includes(sourceArea)) {
          violations.push(`${sourceLocation} ${sourceArea} may not import app route module ${relativeTarget}`);
        }
        continue;
      }
      if (!targetFeature) continue;

      if (!FEATURE_RULES[sourceFeature ?? ""]) {
        if (sourceArea === "app") {
          if (!isFeaturePublicEntry(relativeTarget, targetFeature)) {
            violations.push(`${sourceLocation} app must import ${targetFeature} through features/${targetFeature}/index.ts public API`);
          }
        } else if (sourceArea === "lib") {
          violations.push(`${sourceLocation} shared utility lib may not import feature ${targetFeature}`);
        } else if (sourceArea === "components") {
          if (!isFeaturePublicEntry(relativeTarget, targetFeature)) {
            violations.push(`${sourceLocation} shared component must use ${targetFeature} public API`);
          }
        } else if (sourceArea === "data") {
          violations.push(`${sourceLocation} data may not import feature ${targetFeature}`);
        }
        continue;
      }

      if (sourceFeature === targetFeature) continue;
      graph.get(sourceFeature).add(targetFeature);
      if (!FEATURE_RULES[sourceFeature].has(targetFeature)) {
        violations.push(`${sourceLocation} forbidden dependency ${sourceFeature} -> ${targetFeature}`);
      }
      if (!isFeaturePublicEntry(relativeTarget, targetFeature)) {
        violations.push(`${sourceLocation} cross-feature import must use features/${targetFeature}/index.ts public API`);
      }
    }
  }

  for (const cycle of cyclePaths(graph)) violations.push(`feature dependency cycle: ${cycle}`);
  return { violations, limitations, filesScanned: files.length };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = analyzeProject(process.argv[2] ?? process.cwd());
    for (const violation of result.violations) console.error(`BOUNDARY ERROR: ${violation}`);
    for (const limitation of result.limitations) console.warn(`COVERAGE LIMITATION: ${limitation}`);
    if (result.violations.length) {
      console.error(`Feature boundary check failed: ${result.violations.length} violation(s), ${result.filesScanned} source file(s) scanned.`);
      process.exitCode = 1;
    } else {
      console.log(`Feature boundary check passed: ${result.filesScanned} source file(s) scanned; ${result.limitations.length} coverage limitation(s).`);
    }
  } catch (error) {
    console.error(`Feature boundary checker could not run: ${error.message}`);
    process.exitCode = 2;
  }
}
