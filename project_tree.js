/**
 * Print a project's file tree and the functions/classes inside each file.
 * ES module version (works when package.json has "type": "module").
 *
 * Usage:
 *   node project_tree.js              # current folder
 *   node project_tree.js ./src        # a specific folder
 */
import fs from "fs";
import path from "path";

const IGNORE = new Set([".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build", ".idea", ".vscode"]);

const JS_PATTERNS = [
  /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/,
  /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/,
  /^\s*(?:export\s+)?(?:default\s+)?class\s+([A-Za-z_$][\w$]*)/,
];

function getFunctions(file) {
  const ext = path.extname(file);
  if (![".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"].includes(ext)) return [];

  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return [];
  }

  const found = [];
  for (const line of text.split("\n")) {
    for (const re of JS_PATTERNS) {
      const m = line.match(re);
      if (m) {
        found.push(/class\s/.test(line) ? `class ${m[1]}` : `${m[1]}()`);
        break;
      }
    }
  }
  return found;
}

function printTree(dir, prefix = "") {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => !IGNORE.has(e.name))
    .sort((a, b) => (b.isDirectory() - a.isDirectory()) || a.name.localeCompare(b.name));

  entries.forEach((entry, i) => {
    const last = i === entries.length - 1;
    const full = path.join(dir, entry.name);
    console.log(`${prefix}${last ? "└── " : "├── "}${entry.name}${entry.isDirectory() ? "/" : ""}`);
    const childPrefix = prefix + (last ? "    " : "│   ");
    if (entry.isDirectory()) {
      printTree(full, childPrefix);
    } else {
      for (const fn of getFunctions(full)) console.log(`${childPrefix}    ƒ ${fn}`);
    }
  });
}

const base = process.argv[2] || ".";
console.log(path.resolve(base) + "/");
printTree(base);