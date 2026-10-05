// Lightweight loader for exercising the actual TypeScript store in Node.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");
const root = path.resolve(__dirname, "..");
const requireProject = Module.createRequire(path.join(root, "package.json"));
const cache = new Map();
function load(file) {
  if (!path.isAbsolute(file)) file = path.join(root, file);
  if (!path.extname(file)) file += ".ts";
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const localRequire = (id) =>
    id.startsWith("@/")
      ? load(path.join(root, "src", id.slice(2)))
      : id.startsWith(".")
        ? load(path.resolve(path.dirname(file), id))
        : requireProject(id);
  new Function("require", "module", "exports", source)(
    localRequire,
    module,
    module.exports,
  );
  return module.exports;
}
module.exports = { load };
