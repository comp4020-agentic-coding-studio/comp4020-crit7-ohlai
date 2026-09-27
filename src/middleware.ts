import { defineMiddleware } from "astro:middleware";
import { processOpenWindows } from "./lib/auto-enrol";

// Every request first processes any enrolment window that has opened since
// the last one. This is the whole of auto-enrol's scheduling: fly.toml stops
// the machine when idle, so a timer inside the app would never fire, but the
// request that wakes the machine always runs this.
export const onRequest = defineMiddleware((_context, next) => {
  processOpenWindows(new Date());
  return next();
});
