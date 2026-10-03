import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runsDir = path.join(repoRoot, "harness", "runs");

function option(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

function usage() {
  console.log(`Użycie:
  npm run prompt -- --prompt "Zadanie dla ElectricPaint"
  npm run prompt -- --prompt-file zadanie.md [--model composer-2.5] [--timeout-min 20]

Wymaga CURSOR_API_KEY. Agent pracuje w bieżącym repozytorium.
Po pracy harness uruchamia npm test i npm run build; przy błędzie prosi agenta
o poprawkę (maksymalnie dwa razy). Raport zapisuje w harness/runs/.`);
}

if (process.argv.includes("--help")) {
  usage();
  process.exit(0);
}

const promptText = option("--prompt");
const promptFile = option("--prompt-file");
if (Boolean(promptText) === Boolean(promptFile)) {
  usage();
  throw new Error("Podaj dokładnie jeden z argumentów --prompt lub --prompt-file.");
}
if (!process.env.CURSOR_API_KEY) {
  throw new Error("Ustaw CURSOR_API_KEY (Codex Dashboard → Integrations).");
}

const prompt = promptFile ? readFileSync(path.resolve(promptFile), "utf8") : promptText;
if (!prompt.trim()) throw new Error("Prompt jest pusty.");
const timeoutMin = Number(option("--timeout-min") ?? 20);
if (!Number.isFinite(timeoutMin) || timeoutMin <= 0) {
  throw new Error("--timeout-min musi być dodatnią liczbą.");
}
const model = option("--model") ?? "composer-2.5";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(runsDir, `prompt-${stamp}`);
mkdirSync(runDir, { recursive: true });
writeFileSync(path.join(runDir, "prompt.txt"), prompt);

function validate() {
  const checks = [
    ["test", ["test"]],
    ["build", ["run", "build"]],
  ];
  return checks.map(([name, args]) => {
    const result = spawnSync("npm", args, {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 180_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    writeFileSync(path.join(runDir, `${name}.log`), output);
    return { name, ok: result.status === 0, output: output.slice(-6000) };
  });
}

const { Agent, CursorAgentError } = await import("@cursor/sdk");
const report = { model, prompt, startedAt: new Date().toISOString(), runs: [], checks: [] };
let agent;
try {
  agent = await Agent.create({
    apiKey: process.env.CURSOR_API_KEY,
    model: { id: model },
    local: { cwd: repoRoot, settingSources: [] },
  });

  let nextPrompt = `${prompt}\n\nPracuj w repozytorium ElectricPaint. Ustal plan, wykonaj zadanie, sprawdź wynik i podsumuj zmiany. Nie zapisuj kluczy ani sekretów w plikach.`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const run = await agent.send(nextPrompt);
    console.log(`Próba ${attempt + 1}: run ${run.id}`);
    const transcript = [];
    const timer = setTimeout(() => {
      if (run.supports("cancel")) void run.cancel();
    }, timeoutMin * 60_000);
    let result;
    try {
      for await (const event of run.stream()) transcript.push(event);
      result = await run.wait();
    } finally {
      clearTimeout(timer);
    }
    writeFileSync(path.join(runDir, `transcript-${attempt + 1}.json`), JSON.stringify(transcript, null, 2));
    report.runs.push({ id: run.id, status: result.status, durationMs: result.durationMs ?? null });
    if (result.status !== "finished") break;

    report.checks = validate().map(({ name, ok }) => ({ name, ok }));
    if (report.checks.every((check) => check.ok)) break;
    const failures = validateFailures();
    nextPrompt = `Weryfikacja po wykonaniu zadania nie przeszła. Napraw przyczyny błędów, a następnie podsumuj poprawki.\n\n${failures}`;
  }
} catch (error) {
  report.error = error instanceof CursorAgentError
    ? `Nie udało się uruchomić agenta: ${error.message}`
    : String(error);
  console.error(report.error);
} finally {
  if (agent) await agent[Symbol.asyncDispose]();
  report.finishedAt = new Date().toISOString();
  report.ok = report.runs.at(-1)?.status === "finished" &&
    report.checks.length === 2 && report.checks.every((check) => check.ok);
  writeFileSync(path.join(runDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(`Raport: ${path.join(runDir, "report.json")}`);
  if (!report.ok) process.exitCode = 1;
}

function validateFailures() {
  return report.checks
    .filter((check) => !check.ok)
    .map((check) => `${check.name}:\n${readFileSync(path.join(runDir, `${check.name}.log`), "utf8").slice(-6000)}`)
    .join("\n\n");
}
