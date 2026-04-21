const { spawnSync } = require("node:child_process");

function run(command, args) {
  return spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

function exitOnFailure(result) {
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runWithRetries(command, args, {
  attempts = 1,
  retryDelayMs = 2000,
} = {}) {
  let lastResult = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (attempt > 1) {
      console.log(`Retrying Convex deploy (${attempt}/${attempts})...`);
    }

    const result = run(command, args);
    lastResult = result;

    if (!result.error && result.status === 0) {
      return result;
    }

    if (attempt < attempts) {
      const delayMs = retryDelayMs * attempt;
      console.log(`Convex deploy failed on attempt ${attempt}/${attempts}. Waiting ${Math.round(delayMs / 1000)}s before retry...`);
      sleep(delayMs);
    }
  }

  return lastResult;
}

const vercelEnv = process.env.VERCEL_ENV || "local";

if (vercelEnv !== "production") {
  console.log(`Skipping Convex deploy for Vercel ${vercelEnv} build.`);
  exitOnFailure(run("npm", ["run", "build"]));
}

if (!process.env.CONVEX_DEPLOY_KEY) {
  console.error("CONVEX_DEPLOY_KEY is required for Vercel production builds.");
  process.exit(1);
}

const maxAttempts = Math.max(1, Number(process.env.CONVEX_DEPLOY_RETRIES || 4));

const deployResult = runWithRetries("convex", [
  "deploy",
  "--cmd",
  "npm run build",
  "--cmd-url-env-var-name",
  "NEXT_PUBLIC_CONVEX_URL",
], {
  attempts: maxAttempts,
  retryDelayMs: 3000,
});

exitOnFailure(deployResult);
