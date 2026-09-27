"use client";

import { useEffect, useState, type ComponentType } from "react";
import packageInfo from "../../package.json";
import {
  Archive,
  CalendarDays,
  CircleAlert,
  ClipboardCheck,
  Settings2,
  Users,
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
  const [view, setView] = useState<ViewId>(() => typeof window === "undefined" ? "today" : viewFromHash());

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  function navigate(id: ViewId) {
    window.location.assign("#/" + id);
    setView(id);
  }

  if (error) {
    return <main className="startup-state"><CircleAlert size={28} /><h1>Local data could not be opened</h1><p>{error}</p><button onClick={() => void reload()}>Retry</button></main>;
  }

  if (!data) {
    return (
      <main className="startup-state">
        <img className="startup-logo" src="/rubrilab-icon-transparent.png" alt="RubriLab" />
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
          <div className="brand__mark">
            <img className="brand__icon" src="/rubrilab-icon-transparent.png" alt="RubriLab app icon" />
          </div>
          <div><strong>RubriLab</strong><span>Practical evidence</span></div>
        </div>
        <nav aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={view === id ? "is-active" : ""} onClick={() => navigate(id)}>
              <Icon size={18} /><span>{label}</span>
              {id === "today" && data.sessions.some((session) => session.status === "active") && <span className="nav-live" aria-label="Active session" />}
            </button>
          ))}
        </nav>
        <div className="sidebar__footer">
          <small className="app-version">RubriLab v{packageInfo.version} by <a href="https://github.com/abujalancej/rubrilab" target="_blank" rel="noreferrer">abujalancej</a></small>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <img className="mobile-brand__icon" src="/rubrilab-icon-transparent.png" alt="RubriLab" />
            <span><strong>RubriLab</strong><small>v{packageInfo.version}</small></span>
          </div>
          <div className="topbar__context">
            <span>{navItems.find((item) => item.id === view)?.label}</span>
            <strong>{view === "today" ? "Active laboratory workspace" : (contextClassroom?.name ?? "Classroom workspace") + " · " + (contextSession?.groupName ?? "Whole class")}</strong>
          </div>
        </header>

        <main className="workspace__content">
          {view === "today" && <TodayView data={data} onReload={reload} onCreateSession={() => navigate("history")} />}
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
