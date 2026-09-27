"use client";

import { useCallback, useEffect, useState } from "react";
import { ensureDemoData, repositories } from "@/src/data/dexie";
import type {
  AssessmentPreset,
  AssessmentPeriod,
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
  WeightConfiguration,
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
  assessmentPeriods: AssessmentPeriod[];
  weightConfigurations: WeightConfiguration[];
}

export function useLabData() {
  const [data, setData] = useState<LabData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      await ensureDemoData();
      const snapshot = await repositories.exportSnapshot();
      const classrooms = snapshot.classrooms.sort((a, b) => a.name.localeCompare(b.name));
      const students = snapshot.students.sort((a, b) => a.lastName.localeCompare(b.lastName));
      const sessions = snapshot.sessions.sort((a, b) => b.date.localeCompare(a.date));
      const { presets, criteria, teams, attendance, teamObservations, teacherAssistance, practicalResults, individualObservations, behaviourObservations, assessmentPeriods, weightConfigurations } = snapshot;
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
        assessmentPeriods,
        weightConfigurations,
      });
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open the local database.");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((registration) => registration.update());
    }
  }, [load]);

  return { data, error, reload: load };
}
