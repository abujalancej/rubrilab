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
  const [page, repositories, domain, dataLayer, activeSession, assessment, history, rosterImport, classesView, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/data/repositories.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/domain/model.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/data/dexie.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/TodayView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/AssessmentWorkspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/SessionHistoryView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/data/studentImport.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/SecondaryViews.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /<LabApp \/>/);
  assert.match(repositories, /interface ClassroomRepository/);
  assert.match(repositories, /interface TeamObservationRepository/);
  assert.match(repositories, /putCriterion\(value: Criterion\)/);
  assert.match(domain, /score\?: AssessmentScore/);
  assert.match(domain, /groupName\?: string/);
  assert.match(domain, /externalId\?: string/);
  assert.match(domain, /teamPresetId\?: string/);
  const studentModel = domain.match(/export interface Student \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.doesNotMatch(studentModel, /address|phone|email|birthday/i);
  assert.match(dataLayer, /class RubriLabDatabase extends Dexie/);
  assert.match(dataLayer, /this\.version\(3\)/);
  assert.match(dataLayer, /function createStarterSnapshot/);
  assert.match(dataLayer, /sessions: \[\]/);
  assert.doesNotMatch(dataLayer, /hasHistoricalTeams|session-traffic-light/);
  assert.match(activeSession, /Mark all present/);
  assert.match(activeSession, /Finish anyway/);
  assert.match(activeSession, /behaviourMode/);
  assert.match(activeSession, /repositories\.practicalResults\.put/);
  assert.match(activeSession, /defaultTeamPresetId/);
  assert.match(activeSession, /criterion\.active && criterion\.presetId/);
  assert.match(assessment, /Evidence coverage/);
  assert.match(assessment, /Students to observe/);
  assert.match(assessment, /rubrilab-individual-evidence\.csv/);
  assert.match(history, /Reconstruct attendance, membership and evidence/);
  assert.match(history, /Team preset/);
  assert.match(history, /preset\.scope === "team" && preset\.active/);
  assert.match(history, /preset\.scope === "individual" && preset\.active/);
  assert.doesNotMatch(history, /preset\.subjectArea === subjectArea \|\| preset\.subjectArea === "generic"/);
  assert.match(rosterImport, /parseStudentImport/);
  assert.match(rosterImport, /root\.students \?\? root\.alumnos \?\? root\.alumnes/);
  assert.match(rosterImport, /externalMatch \?\? nameMatch/);
  assert.match(classesView, /Import package/);
  assert.match(classesView, /One file, one source of truth/);
  assert.match(classesView, /Classroom viewer/);
  assert.match(classesView, /Create preset/);
  assert.match(classesView, /Edit preset/);
  assert.match(classesView, /classroomStudents\.map/);
  assert.doesNotMatch(classesView, /StudentGroupEditor/);
  const appShell = await readFile(new URL("../src/ui/LabApp.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(appShell, /Ready offline|Working offline|Teacher workspace|navigator\.onLine/);
  assert.match(styles, /\.view-stack, \.active-session, \.assessment-workspace, \.session-history-workspace \{ width: 100%; max-width: none/);
  assert.match(styles, /--color-primary: #3064F5/);
  assert.match(styles, /--color-accent: #17CCA5/);
  assert.match(styles, /--brand-gradient: linear-gradient\(135deg, #3A97FC 0%, #3064F5 55%, #4C57FB 100%\)/);
  assert.match(styles, /--type-meta: \.75rem/);
  assert.doesNotMatch(styles, /font-size:\s*(?:6|7|8|9|10|11)px/);
  assert.match(domain, /interface AssessmentPeriod/);
  assert.match(domain, /interface WeightConfiguration/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
