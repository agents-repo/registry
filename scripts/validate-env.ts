import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

function normalize(version: string): string {
  return version.trim().replace(/^v/, "");
}

function fail(message: string): never {
  console.error(`ENV CHECK FAILED: ${message}`);
  process.exit(1);
}

function repoRoot(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "..");
}

function readRequiredNodeVersion(rootDir: string): string {
  const nvmrcPath = path.join(rootDir, ".nvmrc");

  if (!fs.existsSync(nvmrcPath)) {
    fail("Missing .nvmrc in repository root.");
  }

  const version = normalize(fs.readFileSync(nvmrcPath, "utf8"));

  if (version.length === 0) {
    fail(".nvmrc exists but does not contain a version.");
  }

  return version;
}

function readRequiredNpmVersion(rootDir: string): string {
  const packageJsonPath = path.join(rootDir, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    fail("Missing package.json in repository root.");
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
    packageManager?: string;
  };

  const packageManager = packageJson.packageManager?.trim();
  if (packageManager === undefined || packageManager.length === 0) {
    fail("package.json is missing packageManager.");
  }

  const managerMatch = /^npm@(\d+\.\d+\.\d+)(?:\+[^\s]+)?$/.exec(packageManager);
  if (managerMatch === null) {
    fail(
      `Unsupported packageManager format: ${packageManager}. Expected npm@x.y.z or npm@x.y.z+integrity.`,
    );
  }

  return normalize(managerMatch[1]);
}

function validateNodeVersionMirror(rootDir: string, requiredNodeVersion: string): void {
  const nodeVersionPath = path.join(rootDir, ".node-version");

  if (!fs.existsSync(nodeVersionPath)) {
    return;
  }

  const mirroredVersion = normalize(fs.readFileSync(nodeVersionPath, "utf8"));
  if (mirroredVersion.length === 0) {
    fail(".node-version exists but does not contain a version.");
  }

  if (mirroredVersion !== requiredNodeVersion) {
    fail(`.node-version (${mirroredVersion}) does not match .nvmrc (${requiredNodeVersion}).`);
  }
}

function main(): void {
  const rootDir = repoRoot();
  const requiredNodeVersion = readRequiredNodeVersion(rootDir);
  const requiredNpmVersion = readRequiredNpmVersion(rootDir);

  validateNodeVersionMirror(rootDir, requiredNodeVersion);

  const nodeVersion = normalize(process.version);
  const userAgent = process.env.npm_config_user_agent;
  const npmMatch = userAgent !== undefined && userAgent.length > 0
    ? /npm\/(\d+\.\d+\.\d+)/.exec(userAgent)
    : null;
  const npmVersion = normalize(npmMatch?.[1] ?? "");

  if (nodeVersion !== requiredNodeVersion) {
    fail(`Node.js ${requiredNodeVersion} is required, found ${nodeVersion}.`);
  }

  if (npmVersion.length === 0) {
    fail(
      "Unable to detect npm version from npm_config_user_agent. Run this command via 'npm run env:check'.",
    );
  }

  if (npmVersion !== requiredNpmVersion) {
    fail(`npm ${requiredNpmVersion} is required, found ${npmVersion}.`);
  }

  console.log(`ENV CHECK OK: node ${nodeVersion}, npm ${npmVersion}`);
}

main();
