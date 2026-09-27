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

export interface ClassroomRepository {
  list(): Promise<Classroom[]>;
  get(id: string): Promise<Classroom | undefined>;
  put(value: Classroom): Promise<void>;
}

export interface StudentRepository {
  list(): Promise<Student[]>;
  listByClassroom(classroomId: string): Promise<Student[]>;
  get(id: string): Promise<Student | undefined>;
  put(value: Student): Promise<void>;
}

export interface SessionRepository {
  list(): Promise<LabSession[]>;
  listByClassroom(classroomId: string): Promise<LabSession[]>;
  get(id: string): Promise<LabSession | undefined>;
  put(value: LabSession): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface SessionTeamRepository {
  listBySession(sessionId: string): Promise<SessionTeam[]>;
  put(value: SessionTeam): Promise<void>;
  updateStatus(id: string, status: TeamOperationalStatus): Promise<void>;
  updateNote(id: string, note?: string): Promise<void>;
}

export interface AttendanceRepository {
  listBySession(sessionId: string): Promise<AttendanceRecord[]>;
  put(value: AttendanceRecord): Promise<void>;
}

export interface TeamObservationRepository {
  listBySession(sessionId: string): Promise<TeamObservation[]>;
  put(value: TeamObservation): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface IndividualObservationRepository {
  listBySession(sessionId: string): Promise<IndividualObservation[]>;
  put(value: IndividualObservation): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface BehaviourObservationRepository {
  listBySession(sessionId: string): Promise<BehaviourObservation[]>;
  put(value: BehaviourObservation): Promise<void>;
}

export interface PresetRepository {
  list(): Promise<AssessmentPreset[]>;
  listCriteria(): Promise<Criterion[]>;
  put(value: AssessmentPreset): Promise<void>;
  putCriterion(value: Criterion): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface AssistanceRepository {
  listBySession(sessionId: string): Promise<TeacherAssistance[]>;
  put(value: TeacherAssistance): Promise<void>;
}

export interface PracticalResultRepository {
  listBySession(sessionId: string): Promise<PracticalResult[]>;
  put(value: PracticalResult): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface AssessmentConfigurationRepository {
  listPeriods(classroomId: string): Promise<AssessmentPeriod[]>;
  putPeriod(value: AssessmentPeriod): Promise<void>;
  listWeights(classroomId: string): Promise<WeightConfiguration[]>;
  putWeights(value: WeightConfiguration): Promise<void>;
}

export interface LabRepositories {
  classrooms: ClassroomRepository;
  students: StudentRepository;
  sessions: SessionRepository;
  teams: SessionTeamRepository;
  attendance: AttendanceRepository;
  teamObservations: TeamObservationRepository;
  individualObservations: IndividualObservationRepository;
  behaviourObservations: BehaviourObservationRepository;
  presets: PresetRepository;
  assistance: AssistanceRepository;
  practicalResults: PracticalResultRepository;
  assessmentConfiguration: AssessmentConfigurationRepository;
  exportSnapshot(): Promise<LabSnapshot>;
  importSnapshot(snapshot: LabSnapshot): Promise<void>;
  resetDemo(): Promise<void>;
}
