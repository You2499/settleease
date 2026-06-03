import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.weekly(
  "weekly-model-diagnostics-and-optimization",
  { dayOfWeek: "sunday", hourUTC: 0, minuteUTC: 0 },
  internal.healthActions.runAiDiagnosticsInternal
);

export default crons;
