import Dexie, { type Table } from "dexie";
import type {
  AssessmentPreset,
  AssessmentPeriod,
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
  TeamOperationalStatus,
  WeightConfiguration,
} from "@/src/domain/model";
import {
  attendanceSchema,
  assessmentPeriodSchema,
  behaviourObservationSchema,
  classroomSchema,
  individualObservationSchema,
  sessionSchema,
  studentSchema,
  teamObservationSchema,
  teamSchema,
  weightConfigurationSchema,
} from "@/src/domain/validation";
import type { LabRepositories } from "./repositories";
import { createDemoSnapshot } from "./seed";

class RubriLabDatabase extends Dexie {
  classrooms!: Table<Classroom, string>;
  students!: Table<Student, string>;
  sessions!: Table<LabSession, string>;
  teams!: Table<SessionTeam, string>;
  attendance!: Table<AttendanceRecord, string>;
  presets!: Table<AssessmentPreset, string>;
  criteria!: Table<Criterion, string>;
  teamObservations!: Table<TeamObservation, string>;
  teacherAssistance!: Table<TeacherAssistance, string>;
  practicalResults!: Table<PracticalResult, string>;
  individualObservations!: Table<IndividualObservation, string>;
  behaviourObservations!: Table<BehaviourObservation, string>;
  assessmentPeriods!: Table<AssessmentPeriod, string>;
  weightConfigurations!: Table<WeightConfiguration, string>;

  constructor() {
    super("rubrilab");
    this.version(1).stores({
      classrooms: "id, name, active, academicYear",
      students: "id, classroomId, active, lastName, [lastName+firstName]",
      sessions: "id, classroomId, date, status, subjectArea",
      teams: "id, sessionId, operationalStatus, *studentIds",
      attendance: "id, sessionId, studentId, status, [sessionId+studentId]",
      presets: "id, subjectArea, scope, active",
      criteria: "id, presetId, scope, subjectArea, active, position",
      teamObservations: "id, sessionId, teamId, criterionId, timestamp, [teamId+criterionId]",
      teacherAssistance: "id, sessionId, teamId, timestamp",
      practicalResults: "id, sessionId, teamId, timestamp",
      individualObservations: "id, sessionId, studentId, criterionId, timestamp",
      behaviourObservations: "id, sessionId, studentId, type, category, timestamp",
    });
    this.version(2).stores({
      assessmentPeriods: "id, classroomId, startDate, endDate, active",
      weightConfigurations: "id, classroomId, periodId",
    });
    this.version(3).stores({}).upgrade(async (transaction) => {
      await Promise.all([
        transaction.table("sessions").clear(),
        transaction.table("teams").clear(),
        transaction.table("attendance").clear(),
        transaction.table("teamObservations").clear(),
        transaction.table("teacherAssistance").clear(),
        transaction.table("practicalResults").clear(),
        transaction.table("individualObservations").clear(),
        transaction.table("behaviourObservations").clear(),
      ]);
    });
  }
}

const database = new RubriLabDatabase();

function createStarterSnapshot(): LabSnapshot {
  const snapshot = createDemoSnapshot();
  return {
    ...snapshot,
    sessions: [],
    teams: [],
    attendance: [],
    teamObservations: [],
    teacherAssistance: [],
    practicalResults: [],
    individualObservations: [],
    behaviourObservations: [],
  };
}

async function writeSnapshot(snapshot: LabSnapshot): Promise<void> {
  snapshot.classrooms.forEach((value) => classroomSchema.parse(value));
  snapshot.students.forEach((value) => studentSchema.parse(value));
  snapshot.sessions.forEach((value) => sessionSchema.parse(value));
  snapshot.teams.forEach((value) => teamSchema.parse(value));
  snapshot.attendance.forEach((value) => attendanceSchema.parse(value));
  snapshot.teamObservations.forEach((value) => teamObservationSchema.parse(value));
  snapshot.individualObservations.forEach((value) => individualObservationSchema.parse(value));
  snapshot.behaviourObservations.forEach((value) => behaviourObservationSchema.parse(value));
  snapshot.assessmentPeriods.forEach((value) => assessmentPeriodSchema.parse(value));
  snapshot.weightConfigurations.forEach((value) => weightConfigurationSchema.parse(value));

  await database.transaction("rw", database.tables, async () => {
    await Promise.all(database.tables.map((table) => table.clear()));
    await database.classrooms.bulkPut(snapshot.classrooms);
    await database.students.bulkPut(snapshot.students);
    await database.sessions.bulkPut(snapshot.sessions);
    await database.teams.bulkPut(snapshot.teams);
    await database.attendance.bulkPut(snapshot.attendance);
    await database.presets.bulkPut(snapshot.presets);
    await database.criteria.bulkPut(snapshot.criteria);
    await database.teamObservations.bulkPut(snapshot.teamObservations);
    await database.teacherAssistance.bulkPut(snapshot.teacherAssistance);
    await database.practicalResults.bulkPut(snapshot.practicalResults);
    await database.individualObservations.bulkPut(snapshot.individualObservations);
    await database.behaviourObservations.bulkPut(snapshot.behaviourObservations);
    await database.assessmentPeriods.bulkPut(snapshot.assessmentPeriods);
    await database.weightConfigurations.bulkPut(snapshot.weightConfigurations);
  });
}

export async function ensureDemoData(): Promise<void> {
  if ((await database.classrooms.count()) === 0) {
    await writeSnapshot(createStarterSnapshot());
  }
}

export const repositories: LabRepositories = {
  classrooms: {
    list: () => database.classrooms.orderBy("name").toArray(),
    get: (id) => database.classrooms.get(id),
    put: async (value) => {
      await database.classrooms.put(classroomSchema.parse(value));
    },
  },
  students: {
    list: () => database.students.orderBy("lastName").toArray(),
    listByClassroom: (classroomId) =>
      database.students.where("classroomId").equals(classroomId).sortBy("lastName"),
    get: (id) => database.students.get(id),
    put: async (value) => {
      await database.students.put(studentSchema.parse(value));
    },
  },
  sessions: {
    list: () => database.sessions.orderBy("date").reverse().toArray(),
    listByClassroom: (classroomId) =>
      database.sessions.where("classroomId").equals(classroomId).reverse().sortBy("date"),
    get: (id) => database.sessions.get(id),
    put: async (value) => {
      await database.sessions.put(sessionSchema.parse(value));
    },
    remove: async (id) => {
      await database.transaction("rw", [
        database.sessions,
        database.teams,
        database.attendance,
        database.teamObservations,
        database.teacherAssistance,
        database.practicalResults,
        database.individualObservations,
        database.behaviourObservations,
      ], async () => {
        await Promise.all([
          database.teams.where("sessionId").equals(id).delete(),
          database.attendance.where("sessionId").equals(id).delete(),
          database.teamObservations.where("sessionId").equals(id).delete(),
          database.teacherAssistance.where("sessionId").equals(id).delete(),
          database.practicalResults.where("sessionId").equals(id).delete(),
          database.individualObservations.where("sessionId").equals(id).delete(),
          database.behaviourObservations.where("sessionId").equals(id).delete(),
        ]);
        await database.sessions.delete(id);
      });
    },
  },
  teams: {
    listBySession: (sessionId) => database.teams.where("sessionId").equals(sessionId).sortBy("name"),
    put: async (value) => {
      await database.teams.put(teamSchema.parse(value));
    },
    updateStatus: async (id: string, operationalStatus: TeamOperationalStatus) => {
      await database.teams.update(id, { operationalStatus });
    },
    updateNote: async (id: string, note?: string) => {
      await database.teams.update(id, { note: note?.trim() || undefined });
    },
  },
  attendance: {
    listBySession: (sessionId) => database.attendance.where("sessionId").equals(sessionId).toArray(),
    put: async (value) => {
      await database.attendance.put(attendanceSchema.parse(value));
    },
  },
  teamObservations: {
    listBySession: (sessionId) => database.teamObservations.where("sessionId").equals(sessionId).toArray(),
    put: async (value) => {
      await database.teamObservations.put(teamObservationSchema.parse(value));
    },
    remove: (id) => database.teamObservations.delete(id).then(() => undefined),
  },
  individualObservations: {
    listBySession: (sessionId) => database.individualObservations.where("sessionId").equals(sessionId).toArray(),
    put: async (value) => {
      await database.individualObservations.put(individualObservationSchema.parse(value));
    },
    remove: (id) => database.individualObservations.delete(id).then(() => undefined),
  },
  behaviourObservations: {
    listBySession: (sessionId) => database.behaviourObservations.where("sessionId").equals(sessionId).toArray(),
    put: async (value) => {
      await database.behaviourObservations.put(behaviourObservationSchema.parse(value));
    },
  },
  presets: {
    list: () => database.presets.toArray(),
    listCriteria: () => database.criteria.orderBy("position").toArray(),
    put: async (value) => {
      await database.presets.put(value);
    },
    putCriterion: async (value) => {
      await database.criteria.put(value);
    },
  },
  assistance: {
    listBySession: (sessionId) => database.teacherAssistance.where("sessionId").equals(sessionId).toArray(),
    put: async (value) => {
      if (![0, 1, 2, 3].includes(value.level)) throw new Error("Teacher support must be from 0 to 3.");
      await database.teacherAssistance.put(value);
    },
  },
  practicalResults: {
    listBySession: (sessionId) => database.practicalResults.where("sessionId").equals(sessionId).toArray(),
    put: async (value) => {
      if (value.score !== undefined && ![1, 2, 3, 4].includes(value.score)) {
        throw new Error("A practical result must be 1–4 or not observed.");
      }
      await database.practicalResults.put(value);
    },
    remove: (id) => database.practicalResults.delete(id).then(() => undefined),
  },
  assessmentConfiguration: {
    listPeriods: (classroomId) => database.assessmentPeriods.where("classroomId").equals(classroomId).sortBy("startDate"),
    putPeriod: async (value) => {
      await database.assessmentPeriods.put(assessmentPeriodSchema.parse(value));
    },
    listWeights: (classroomId) => database.weightConfigurations.where("classroomId").equals(classroomId).toArray(),
    putWeights: async (value) => {
      await database.weightConfigurations.put(weightConfigurationSchema.parse(value));
    },
  },
  exportSnapshot: async () => ({
    classrooms: await database.classrooms.toArray(),
    students: await database.students.toArray(),
    sessions: await database.sessions.toArray(),
    teams: await database.teams.toArray(),
    attendance: await database.attendance.toArray(),
    presets: await database.presets.toArray(),
    criteria: await database.criteria.toArray(),
    teamObservations: await database.teamObservations.toArray(),
    teacherAssistance: await database.teacherAssistance.toArray(),
    practicalResults: await database.practicalResults.toArray(),
    individualObservations: await database.individualObservations.toArray(),
    behaviourObservations: await database.behaviourObservations.toArray(),
    assessmentPeriods: await database.assessmentPeriods.toArray(),
    weightConfigurations: await database.weightConfigurations.toArray(),
  }),
  importSnapshot: writeSnapshot,
  resetDemo: async () => writeSnapshot(createStarterSnapshot()),
};
