import { z } from "zod";
import {
  attendanceReasons,
  attendanceStatuses,
  behaviourCategories,
  sessionStatuses,
  subjectAreas,
  teamStatuses,
} from "./model";

const stableId = z.string().min(3);
const timestamp = z.string().datetime();
const score = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const classroomSchema = z.object({
  id: stableId,
  name: z.string().min(1),
  academicYear: z.string().min(4),
  active: z.boolean(),
});

export const studentSchema = z.object({
  id: stableId,
  externalId: z.string().min(1).optional(),
  classroomId: stableId,
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  shortName: z.string().min(1).optional(),
  groupName: z.string().min(1).optional(),
  active: z.boolean(),
});

export const sessionSchema = z.object({
  id: stableId,
  classroomId: stableId,
  groupName: z.string().min(1).optional(),
  title: z.string().min(1),
  date: z.iso.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  subjectArea: z.enum(subjectAreas),
  teamPresetId: stableId.optional(),
  individualPresetId: stableId.optional(),
  status: z.enum(sessionStatuses),
  notes: z.string().optional(),
});

export const teamSchema = z.object({
  id: stableId,
  sessionId: stableId,
  name: z.string().min(1),
  studentIds: z.array(stableId).min(1),
  operationalStatus: z.enum(teamStatuses),
  note: z.string().max(240).optional(),
});

export const attendanceSchema = z.object({
  id: stableId,
  studentId: stableId,
  sessionId: stableId,
  status: z.enum(attendanceStatuses),
  reason: z.enum(attendanceReasons).optional(),
  events: z.array(
    z.object({
      id: stableId,
      timestamp,
      kind: z.enum(["entered", "present", "arrived-late", "left-early", "returned"]),
      note: z.string().optional(),
    }),
  ),
  note: z.string().optional(),
});

const observationBase = z.object({
  id: stableId,
  sessionId: stableId,
  criterionId: stableId,
  score: score.optional(),
  note: z.string().optional(),
  timestamp,
});

export const teamObservationSchema = observationBase.extend({ teamId: stableId });
export const individualObservationSchema = observationBase.extend({ studentId: stableId });

export const behaviourObservationSchema = z.object({
  id: stableId,
  studentId: stableId,
  sessionId: stableId,
  type: z.enum(["positive", "incident"]),
  category: z.enum(behaviourCategories),
  note: z.string().optional(),
  timestamp,
});

export const assessmentScoreSchema = score;

export const assessmentPeriodSchema = z.object({
  id: stableId,
  classroomId: stableId,
  name: z.string().min(1),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  active: z.boolean(),
}).refine((value) => value.startDate <= value.endDate, {
  message: "Assessment period end date must follow its start date.",
});

export const weightConfigurationSchema = z.object({
  id: stableId,
  classroomId: stableId,
  periodId: stableId.optional(),
  teamPerformance: z.number().min(0).max(100),
  individualPerformance: z.number().min(0).max(100),
  practicalResult: z.number().min(0).max(100),
  teamCriterionWeights: z.record(z.string(), z.number().min(0).max(100)),
  individualCriterionWeights: z.record(z.string(), z.number().min(0).max(100)),
});
