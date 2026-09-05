"use client";

import { useCallback, useEffect, useState } from "react";
import { ensureDemoData, repositories } from "@/src/data/dexie";
import type {
  AssessmentPreset,
  AttendanceRecord,
  BehaviourObservation,
  Classroom,
  Criterion,
  IndividualObservation,
  LabSession,
  PracticalResult,
  SessionTeam,
  Student,
  TeacherAssistance,
  TeamObservation,
} from "@/src/domain/model";

export interface LabData {
  classrooms: Classroom[];
  students: Student[];
  sessions: LabSession[];
  teams: SessionTeam[];
  attendance: AttendanceRecord[];
  presets: AssessmentPreset[];
  criteria: Criterion[];
  teamObservations: TeamObservation[];
  teacherAssistance: TeacherAssistance[];
  practicalResults: PracticalResult[];
  individualObservations: IndividualObservation[];
  behaviourObservations: BehaviourObservation[];
}

export function useLabData() {
  const [data, setData] = useState<LabData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      await ensureDemoData();
      const [classrooms, students, sessions, presets, criteria] = await Promise.all([
        repositories.classrooms.list(),
        repositories.students.list(),
        repositories.sessions.list(),
        repositories.presets.list(),
        repositories.presets.listCriteria(),
      ]);
      const activeSession = sessions.find((session) => session.status === "active") ?? sessions[0];
      const sessionId = activeSession?.id;
      const [teams, attendance, teamObservations, teacherAssistance, practicalResults, individualObservations, behaviourObservations] = sessionId
        ? await Promise.all([
            repositories.teams.listBySession(sessionId),
            repositories.attendance.listBySession(sessionId),
            repositories.teamObservations.listBySession(sessionId),
            repositories.assistance.listBySession(sessionId),
            repositories.practicalResults.listBySession(sessionId),
            repositories.individualObservations.listBySession(sessionId),
            repositories.behaviourObservations.listBySession(sessionId),
          ])
        : [[], [], [], [], [], [], []];
      setData({
        classrooms,
        students,
        sessions,
        teams,
        attendance,
        presets,
        criteria,
        teamObservations,
        teacherAssistance,
        practicalResults,
        individualObservations,
        behaviourObservations,
      });
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open the local database.");
    }
  }, []);

  useEffect(() => {
    void load();
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, [load]);

  return { data, error, reload: load };
}
