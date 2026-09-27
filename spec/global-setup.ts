import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { type AddressInfo, createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    baseUrl: string;
  }
}

// Boot the BUILT server (the same artefact the Dockerfile runs) on a free
// port with a throwaway database, so the spec asserts what actually ships —
// not the dev server, and never your local data.
//
// SPEC_BASE_URL points the suite at a deployed app instead, for a machine
// that cannot run the built server (this one: better-sqlite3 will not build
// on Windows ARM64). The flow tests write to that app's database and clean
// up after themselves, so aim it only at your own deploy.
export default async function setup(project: TestProject): Promise<() => void> {
  const remote = process.env.SPEC_BASE_URL;
  if (remote) {
    project.provide("baseUrl", remote.replace(/\/$/, ""));
    return () => {};
  }

  const entry = "./dist/server/entry.mjs";
  if (!existsSync(entry)) {
    throw new Error(`${entry} not found — run \`pnpm test\`, which builds first`);
  }

  const port = await new Promise<number>((resolve) => {
    const probe = createServer();
    probe.listen(0, () => {
      const address = probe.address() as AddressInfo;
      probe.close(() => resolve(address.port));
    });
  });

  const server = spawn("node", [entry], {
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      DATABASE_PATH: join(mkdtempSync(join(tmpdir(), "spec-db-")), "test.db"),
    },
    stdio: "ignore",
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(baseUrl);
      if (res.ok) break;
    } catch {
      // not up yet
    }
    if (attempt >= 50) {
      server.kill();
      throw new Error(`server did not come up at ${baseUrl}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  project.provide("baseUrl", baseUrl);
  return () => {
    server.kill();
  };
}
