const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const rootDir = path.join(__dirname, "..");
const iconsDir = path.join(rootDir, "lucide-icons");
const metadataFile = path.join(rootDir, "src/lib/lucide-icons-metadata.json");

function runScript(scriptName) {
  const result = spawnSync(process.execPath, [path.join(__dirname, scriptName)], {
    cwd: rootDir,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hasDownloadedIcons() {
  if (!fs.existsSync(iconsDir)) return false;
  return fs.readdirSync(iconsDir).some((file) => file.endsWith(".json"));
}

if (!fs.existsSync(metadataFile)) {
  if (!hasDownloadedIcons()) {
    runScript("download-lucide-icons.js");
  }

  runScript("generate-lucide-metadata.js");
}
