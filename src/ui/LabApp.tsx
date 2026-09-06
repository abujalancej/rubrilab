"use client";

import { useEffect, useState, type ComponentType } from "react";
import {
  Archive,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Settings2,
  Users,
  WifiOff,
} from "lucide-react";
import { TodayView } from "./TodayView";
import { ClassesView, SettingsView } from "./SecondaryViews";
import { AssessmentWorkspace } from "./AssessmentWorkspace";
import { SessionHistoryView } from "./SessionHistoryView";
import { useLabData } from "./useLabData";

type ViewId = "today" | "classes" | "history" | "assessment" | "settings";

const navItems: Array<{ id: ViewId; label: string; icon: ComponentType<{ size?: number }> }> = [
  { id: "today", label: "Today", icon: CalendarDays },
  { id: "classes", label: "Classes", icon: Users },
  { id: "history", label: "History", icon: Archive },
  { id: "assessment", label: "Assessment", icon: ClipboardCheck },
  { id: "settings", label: "Settings", icon: Settings2 },
];

function viewFromHash(): ViewId {
  const value = window.location.hash.replace("#/", "");
  return navItems.some((item) => item.id === value) ? value as ViewId : "today";
}

export function LabApp() {
  const { data, error, reload } = useLabData();
  const [view, setView] = useState<ViewId>("today");
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setView(viewFromHash());
    setOnline(navigator.onLine);
    const onHash = () => setView(viewFromHash());
    const onOnline = () => setOnline(navigator.onLine);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOnline);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOnline);
    };
  }, []);

  function navigate(id: ViewId) {
    window.location.hash = "/" + id;
    setView(id);
  }

  if (error) {
    return <main className="startup-state"><WifiOff size={28} /><h1>Local data could not be opened</h1><p>{error}</p><button onClick={() => void reload()}>Try again</button></main>;
  }

  if (!data) {
    return (
      <main className="startup-state">
        <div className="loader-mark"><GraduationCap size={25} /></div>
        <h1>Preparing today’s laboratory</h1>
        <p>Opening your local classroom records…</p>
      </main>
    );
  }

  const contextSession = data.sessions.find((session) => session.status === "active") ?? data.sessions[0];
  const contextClassroom = data.classrooms.find((classroom) => classroom.id === contextSession?.classroomId);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand__mark"><BookOpenCheck size={22} /></div>
          <div><strong>RubriLab</strong><span>Practical evidence</span></div>
        </div>
        <nav aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={view === id ? "is-active" : ""} onClick={() => navigate(id)}>
              <Icon size={18} /><span>{label}</span>
              {id === "today" && <span className="nav-live" aria-label="Active session" />}
            </button>
          ))}
        </nav>
        <div className="sidebar__footer">
          <span className={"connection-status " + (online ? "" : "is-offline")}>
            {online ? <CheckCircle2 size={14} /> : <WifiOff size={14} />}
            {online ? "Ready offline" : "Working offline"}
          </span>
          <div className="teacher-chip"><span>AB</span><div><strong>Teacher workspace</strong><small>2026–27</small></div></div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><BookOpenCheck size={20} /><strong>RubriLab</strong></div>
          <div className="topbar__context">
            <span>{navItems.find((item) => item.id === view)?.label}</span>
            <strong>{view === "today" ? "Active laboratory workspace" : (contextClassroom?.name ?? "Classroom workspace") + " · " + (contextSession?.groupName ?? "Whole class")}</strong>
          </div>
          <span className="storage-note">Stored on this device</span>
        </header>

        <main className="workspace__content">
          {view === "today" && <TodayView data={data} onReload={reload} />}
          {view === "classes" && <ClassesView data={data} />}
          {view === "history" && <SessionHistoryView data={data} onReload={reload} />}
          {view === "assessment" && <AssessmentWorkspace data={data} onReload={reload} />}
          {view === "settings" && <SettingsView data={data} onReload={reload} />}
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={view === id ? "is-active" : ""} onClick={() => navigate(id)}>
            <Icon size={19} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
