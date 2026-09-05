import type {
  AssessmentPreset,
  AttendanceRecord,
  BehaviourObservation,
  Classroom,
  Criterion,
  IndividualObservation,
  LabSession,
  LabSnapshot,
  PracticalResult,
  SessionTeam,
  Student,
  TeacherAssistance,
  TeamObservation,
} from "@/src/domain/model";

const studentNames = [
  ["Aina", "Casals"],
  ["Marc", "Pujol"],
  ["Laia", "Ferrer"],
  ["Nil", "Soler"],
  ["Júlia", "Martí"],
  ["Pol", "Navarro"],
  ["Carla", "Vidal"],
  ["Biel", "Roca"],
  ["Nora", "Serra"],
  ["Àlex", "Costa"],
  ["Martina", "Giménez"],
  ["Jan", "Domènech"],
  ["Clàudia", "Ruiz"],
  ["Adrià", "Font"],
  ["Emma", "Sánchez"],
  ["Oriol", "Miró"],
  ["Ivet", "Moreno"],
  ["Pau", "Bosch"],
  ["Arlet", "Prats"],
  ["Hugo", "Molina"],
  ["Mar", "Torres"],
  ["Guillem", "Duran"],
  ["Ona", "Puig"],
  ["Eric", "López"],
] as const;

function localDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function at(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function createDemoSnapshot(): LabSnapshot {
  const today = localDate();
  const classroom: Classroom = {
    id: "class-3eso-b",
    name: "3 ESO B",
    academicYear: "2026–27",
    active: true,
  };

  const students: Student[] = studentNames.map(([firstName, lastName], index) => ({
    id: `student-${String(index + 1).padStart(2, "0")}`,
    classroomId: classroom.id,
    firstName,
    lastName,
    shortName: firstName,
    active: true,
  }));

  const activeSession: LabSession = {
    id: "session-obstacle-robot",
    classroomId: classroom.id,
    title: "Obstacle Avoiding Robot",
    date: today,
    startTime: "09:00",
    endTime: "10:50",
    subjectArea: "robotics",
    status: "active",
    notes: "Build, calibrate and test the ultrasonic sensor control loop.",
  };

  const sessions: LabSession[] = [
    activeSession,
    {
      id: "session-traffic-light",
      classroomId: classroom.id,
      title: "Traffic Light Controller",
      date: localDate(-7),
      startTime: "09:00",
      endTime: "10:50",
      subjectArea: "digital-electronics",
      status: "completed",
    },
    {
      id: "session-phone-stand",
      classroomId: classroom.id,
      title: "Parametric Phone Stand",
      date: localDate(-14),
      startTime: "09:00",
      endTime: "10:50",
      subjectArea: "3d-printing",
      status: "completed",
    },
    {
      id: "session-line-follower",
      classroomId: classroom.id,
      title: "Line Follower Calibration",
      date: localDate(-21),
      startTime: "09:00",
      endTime: "10:50",
      subjectArea: "robotics",
      status: "completed",
    },
  ];

  const states = ["working", "needs-help", "working", "working", "working", "finished"] as const;
  const teams: SessionTeam[] = Array.from({ length: 6 }, (_, index) => ({
    id: `team-${index + 1}`,
    sessionId: activeSession.id,
    name: `Team ${index + 1}`,
    studentIds: students.slice(index * 4, index * 4 + 4).map((student) => student.id),
    operationalStatus: states[index],
  }));

  const attendance: AttendanceRecord[] = students.map((student, index) => {
    const base = {
      id: `attendance-${student.id}`,
      studentId: student.id,
      sessionId: activeSession.id,
    };
    if (index === 3) {
      return { ...base, status: "absent", reason: "medical", events: [] };
    }
    if (index === 6) {
      return {
        ...base,
        status: "late",
        events: [
          {
            id: "event-late-07",
            timestamp: at(today, "09:15"),
            kind: "arrived-late",
            note: "Arrived after morning assembly.",
          },
        ],
      };
    }
    if (index === 17) {
      return {
        ...base,
        status: "left-early",
        reason: "authorised",
        events: [
          { id: "event-present-18", timestamp: at(today, "09:00"), kind: "present" },
          {
            id: "event-left-18",
            timestamp: at(today, "10:20"),
            kind: "left-early",
            note: "Authorised early collection.",
          },
        ],
      };
    }
    return {
      ...base,
      status: "present",
      events: [{ id: `event-present-${index + 1}`, timestamp: at(today, "09:00"), kind: "present" }],
    };
  });

  const teamCriterionNames: Record<string, string[]> = {
    common: ["Organisation", "Teamwork", "Working method", "Use of equipment/material", "Result"],
    robotics: ["Organisation", "Teamwork", "Problem solving", "Build/programming process", "Result"],
    electronics: ["Organisation", "Teamwork", "Assembly method", "Error checking", "Result"],
    printing: ["Organisation", "Teamwork", "Design/preparation", "Error correction", "Result"],
  };
  const subjectByPreset = {
    common: "generic",
    robotics: "robotics",
    electronics: "digital-electronics",
    printing: "3d-printing",
  } as const;

  const criteria: Criterion[] = Object.entries(teamCriterionNames).flatMap(([presetKey, names]) =>
    names.map((name, position) => ({
      id: `criterion-${presetKey}-${name.toLowerCase().replace(/[^a-z]+/g, "-")}`,
      name,
      scope: "team" as const,
      subjectArea: subjectByPreset[presetKey as keyof typeof subjectByPreset],
      presetId: `preset-${presetKey}`,
      position,
      active: true,
    })),
  );

  const individualNames = ["Engagement", "Autonomy", "Contribution", "Technical learning", "Responsibility"];
  const individualCriteria: Criterion[] = individualNames.map((name, position) => ({
    id: `criterion-individual-${name.toLowerCase().replace(/[^a-z]+/g, "-")}`,
    name,
    scope: "individual",
    presetId: "preset-individual",
    position,
    active: true,
  }));
  criteria.push(...individualCriteria);

  const presets: AssessmentPreset[] = Object.keys(teamCriterionNames).map((key) => ({
    id: `preset-${key}`,
    name: key === "common" ? "Common team criteria" : key === "electronics" ? "Digital Electronics" : key === "printing" ? "3D Printing" : "Robotics",
    subjectArea: subjectByPreset[key as keyof typeof subjectByPreset],
    scope: "team",
    criterionIds: criteria.filter((criterion) => criterion.presetId === `preset-${key}`).map((criterion) => criterion.id),
    active: true,
  }));
  presets.push({
    id: "preset-individual",
    name: "Individual evidence",
    subjectArea: "generic",
    scope: "individual",
    criterionIds: individualCriteria.map((criterion) => criterion.id),
    active: true,
  });

  const robotCriteria = criteria.filter((criterion) => criterion.presetId === "preset-robotics" && criterion.name !== "Result");
  const teamObservations: TeamObservation[] = [
    [0, 0, 3], [0, 1, 4], [0, 2, 3], [1, 0, 2], [1, 1, 3], [1, 2, 2],
    [2, 0, 4], [2, 1, 3], [3, 0, 3], [4, 1, 4], [5, 0, 4], [5, 1, 4], [5, 2, 3], [5, 3, 4],
  ].map(([teamIndex, criterionIndex, scoreValue], index) => ({
    id: `team-observation-${index + 1}`,
    teamId: teams[teamIndex].id,
    sessionId: activeSession.id,
    criterionId: robotCriteria[criterionIndex].id,
    score: scoreValue as 1 | 2 | 3 | 4,
    timestamp: at(today, `09:${String(20 + index * 2).padStart(2, "0")}`),
  }));

  const teacherAssistance: TeacherAssistance[] = teams.map((team, index) => ({
    id: `assistance-${team.id}`,
    teamId: team.id,
    sessionId: activeSession.id,
    level: index === 1 ? 2 : index === 3 ? 1 : 0,
    interventionCount: index === 1 ? 3 : index === 3 ? 1 : 0,
    timestamp: at(today, "10:05"),
  }));

  const practicalResults: PracticalResult[] = [
    { id: "result-team-1", teamId: "team-1", sessionId: activeSession.id, score: 3, timestamp: at(today, "10:25") },
    { id: "result-team-6", teamId: "team-6", sessionId: activeSession.id, score: 4, timestamp: at(today, "10:35") },
  ];

  const individualObservations: IndividualObservation[] = [
    ["student-01", 0, 4], ["student-02", 2, 3], ["student-07", 1, 3],
    ["student-12", 3, 4], ["student-21", 4, 4], ["student-23", 2, 3],
  ].map(([studentId, criterionIndex, scoreValue], index) => ({
    id: `individual-observation-${index + 1}`,
    studentId: String(studentId),
    sessionId: activeSession.id,
    criterionId: individualCriteria[Number(criterionIndex)].id,
    score: Number(scoreValue) as 1 | 2 | 3 | 4,
    timestamp: at(today, `10:${String(8 + index * 3).padStart(2, "0")}`),
  }));

  const behaviourObservations: BehaviourObservation[] = [
    {
      id: "behaviour-positive-1",
      studentId: "student-11",
      sessionId: activeSession.id,
      type: "positive",
      category: "helps-teammates",
      note: "Helped another team check their sensor wiring.",
      timestamp: at(today, "10:02"),
    },
    {
      id: "behaviour-incident-1",
      studentId: "student-15",
      sessionId: activeSession.id,
      type: "incident",
      category: "distracted",
      note: "Needed a reminder to return to the test plan.",
      timestamp: at(today, "09:48"),
    },
  ];

  return {
    classrooms: [classroom],
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
  };
}
