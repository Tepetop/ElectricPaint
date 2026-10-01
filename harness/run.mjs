import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const harnessDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(harnessDir, "..");
const tasksDir = path.join(harnessDir, "tasks");
const runsDir = path.join(harnessDir, "runs");

const GRADE_CONFIG = `import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/domain/harness-grade.test.ts"],
  },
});
`;

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function loadTasks() {
  return readdirSync(tasksDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(tasksDir, entry.name);
      const task = JSON.parse(readFileSync(path.join(dir, "task.json"), "utf8"));
      const seedPath = path.join(dir, "seed.patch");
      return {
        ...task,
        gradePath: path.join(dir, "grade.test.ts"),
        seedPath: existsSync(seedPath) ? seedPath : null,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function run(cmd, args, cwd, input) {
  const result = spawnSync(cmd, args, { cwd, input, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed\n${result.stderr || result.stdout}`);
  }
  return result;
}

function materialize(dest) {
  mkdirSync(dest, { recursive: true });
  const archive = spawnSync("git", ["archive", "HEAD"], { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 });
  if (archive.status !== 0) throw new Error(archive.stderr.toString());
  const extract = spawnSync("tar", ["-x", "-C", dest], { input: archive.stdout });
  if (extract.status !== 0) throw new Error(extract.stderr.toString());
  rmSync(path.join(dest, "harness"), { recursive: true, force: true });
  if (existsSync(path.join(dest, "harness"))) {
    throw new Error("kopia agenta nadal zawiera katalog harness");
  }
  symlinkSync(path.join(repoRoot, "node_modules"), path.join(dest, "node_modules"));
}

function applySeed(dest, seedPath) {
  run("patch", ["-p1", "--forward", "--batch", "-i", seedPath], dest);
}

function vitest(dest, args) {
  const bin = path.join(repoRoot, "node_modules/.bin/vitest");
  const result = spawnSync(bin, args, { cwd: dest, encoding: "utf8" });
  return { ok: result.status === 0, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

function regression(dest) {
  return vitest(dest, ["run", "--config", "vite.config.ts"]);
}

function grade(dest, task) {
  copyFileSync(task.gradePath, path.join(dest, "src/domain/harness-grade.test.ts"));
  writeFileSync(path.join(dest, "harness-grade.vitest.config.ts"), GRADE_CONFIG);
  return vitest(dest, ["run", "--config", "harness-grade.vitest.config.ts"]);
}

function prepare(dest, task, { seed }) {
  rmSync(dest, { recursive: true, force: true });
  materialize(dest);
  if (seed) applySeed(dest, task.seedPath);
}

function baselineCommit(dest) {
  const git = (args) => run("git", args, dest);
  git(["init"]);
  git(["add", "-A"]);
  // ponytail: one fresh commit so the agent cannot `git show` the hidden tests.
  // Upgrade path: keep graders in a repo the agent never clones.
  git(["-c", "user.email=eval@local", "-c", "user.name=eval", "commit", "-m", "baseline"]);
}

function selectedTasks(tasks) {
  const wanted = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === "--task") wanted.push(process.argv[i + 1]);
  }
  if (wanted.length === 0) return tasks;
  const picked = tasks.filter((task) => wanted.includes(task.id));
  const missing = wanted.filter((id) => !picked.some((task) => task.id === id));
  if (missing.length > 0) throw new Error(`Nie ma zadań: ${missing.join(", ")}`);
  return picked;
}

function selfCheck(tasks) {
  const root = path.join(runsDir, "self-check");
  rmSync(root, { recursive: true, force: true });
  for (const task of tasks) {
    const base = path.join(root, `${task.id}-base`);
    prepare(base, task, { seed: false });
    const baseRegression = regression(base);
    if (!baseRegression.ok) {
      throw new Error(`${task.id}: testy projektu padły na czystym kodzie\n${baseRegression.output.slice(-2000)}`);
    }
    const baseGrade = grade(base, task);
    const actual = baseGrade.ok ? "pass" : "fail";
    if (actual !== task.baseGrade) {
      throw new Error(`${task.id}: ukryty test na czystym kodzie to ${actual}, a ma być ${task.baseGrade}\n${baseGrade.output.slice(-2000)}`);
    }
    if (task.seedPath) {
      const seeded = path.join(root, `${task.id}-seed`);
      prepare(seeded, task, { seed: true });
      const seededRegression = regression(seeded);
      if (!seededRegression.ok) {
        throw new Error(`${task.id}: seed psuje istniejące testy\n${seededRegression.output.slice(-2000)}`);
      }
      const seededGrade = grade(seeded, task);
      if (seededGrade.ok) throw new Error(`${task.id}: seed nie oblał ukrytego testu`);
    }
    console.log(`${task.id}: ok`);
  }
  rmSync(root, { recursive: true, force: true });
  console.log("self-check przeszedł");
}

async function evaluate(tasks) {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) throw new Error("Ustaw CURSOR_API_KEY (Cursor Dashboard → Integrations).");
  const model = argValue("--model") ?? "composer-2.5";
  const { Agent, CursorAgentError } = await import("@cursor/sdk");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const root = path.join(runsDir, stamp);
  mkdirSync(root, { recursive: true });
  const report = [];

  for (const task of tasks) {
    const dest = path.join(root, task.id);
    prepare(dest, task, { seed: Boolean(task.seedPath) });
    baselineCommit(dest);
    const timeoutMin = Number(argValue("--timeout-min")) || task.timeoutMin || 8;
    const prompt = `${task.prompt}\n\nNie dodawaj testów.`;
    console.log(`\n${task.id} (${model})`);
    let agentStatus = "error";
    let durationMs = 0;
    const agent = await Agent.create({
      apiKey,
      model: { id: model },
      local: { cwd: dest, settingSources: [] },
    });
    try {
      const run = await agent.send(prompt);
      console.log(`run ${run.id}`);
      const timer = setTimeout(() => {
        if (run.supports("cancel")) void run.cancel();
      }, timeoutMin * 60 * 1000);
      const transcript = [];
      try {
        for await (const event of run.stream()) transcript.push(event);
        const result = await run.wait();
        agentStatus = result.status;
        durationMs = result.durationMs ?? 0;
        writeFileSync(path.join(dest, "result.json"), JSON.stringify(result, null, 2));
      } finally {
        clearTimeout(timer);
      }
      writeFileSync(path.join(dest, "transcript.json"), JSON.stringify(transcript));
    } catch (err) {
      if (err instanceof CursorAgentError) {
        throw new Error(`Agent nie wystartował (${task.id}): ${err.message}`);
      }
      throw err;
    } finally {
      await agent[Symbol.asyncDispose]();
    }

    const regressionResult = regression(dest);
    const gradeResult = grade(dest, task);
    const passed = agentStatus === "finished" && regressionResult.ok && gradeResult.ok;
    writeFileSync(path.join(dest, "grade.log"), gradeResult.output);
    writeFileSync(path.join(dest, "regression.log"), regressionResult.output);
    report.push({ id: task.id, agentStatus, passed, grade: gradeResult.ok, regression: regressionResult.ok, durationMs, workdir: dest });
    console.log(`${task.id}: ${passed ? "zaliczone" : "niezaliczone"} (agent ${agentStatus}, test ukryty ${gradeResult.ok ? "ok" : "fail"}, regresja ${regressionResult.ok ? "ok" : "fail"})`);
  }

  writeFileSync(path.join(root, "report.json"), JSON.stringify({ model, tasks: report }, null, 2));
  console.log(`\nRaport: ${path.join(root, "report.json")}`);
  if (report.some((item) => !item.passed)) process.exitCode = 1;
}

const tasks = selectedTasks(loadTasks());
if (process.argv.includes("--list")) {
  for (const task of tasks) console.log(`${task.id}\t${task.title}`);
} else if (process.argv.includes("--self-check")) {
  if (!existsSync(path.join(repoRoot, "node_modules/vitest"))) {
    throw new Error("Brak zależności projektu. W katalogu repo uruchom npm install.");
  }
  selfCheck(tasks);
} else {
  await evaluate(tasks);
}
