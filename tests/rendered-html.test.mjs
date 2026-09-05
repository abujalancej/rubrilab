import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", String(Date.now()));
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server renders the RubriLab application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>RubriLab — Practical classroom evidence<\/title>/i);
  assert.match(html, /Preparing today’s laboratory/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps persistence and domain concerns separated", async () => {
  const [page, repositories, domain, dataLayer, activeSession, assessment, history] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/data/repositories.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/domain/model.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/data/dexie.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/TodayView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/AssessmentWorkspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/SessionHistoryView.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /<LabApp \/>/);
  assert.match(repositories, /interface ClassroomRepository/);
  assert.match(repositories, /interface TeamObservationRepository/);
  assert.match(domain, /score\?: AssessmentScore/);
  const studentModel = domain.match(/export interface Student \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.doesNotMatch(studentModel, /address|phone|email|birthday/i);
  assert.match(dataLayer, /class RubriLabDatabase extends Dexie/);
  assert.match(activeSession, /Mark all present/);
  assert.match(activeSession, /Finish anyway/);
  assert.match(activeSession, /behaviourMode/);
  assert.match(activeSession, /repositories\.practicalResults\.put/);
  assert.match(assessment, /Evidence coverage/);
  assert.match(assessment, /Students to observe/);
  assert.match(assessment, /rubrilab-individual-evidence\.csv/);
  assert.match(history, /Reconstruct attendance, membership and evidence/);
  assert.match(domain, /interface AssessmentPeriod/);
  assert.match(domain, /interface WeightConfiguration/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
