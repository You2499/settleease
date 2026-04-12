const { spawnSync } = require("node:child_process");

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

const vercelEnv = process.env.VERCEL_ENV || "local";

if (vercelEnv !== "production") {
  console.log(`Skipping Convex deploy for Vercel ${vercelEnv} build.`);
  run("npm", ["run", "build"]);
}

if (!process.env.CONVEX_DEPLOY_KEY) {
  console.error("CONVEX_DEPLOY_KEY is required for Vercel production builds.");
  process.exit(1);
}

run("convex", [
  "deploy",
  "--cmd",
  "npm run build",
  "--cmd-url-env-var-name",
  "NEXT_PUBLIC_CONVEX_URL",
]);
