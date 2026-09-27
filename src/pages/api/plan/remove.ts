import type { APIRoute } from "astro";
import { removePlanEntry } from "../../../lib/db";
import { safeBack, withNotice } from "../../../lib/view";

// Takes a course out of a semester of the plan. An enrolment in that course
// is left alone: dropping is an enrolment action, not a planning one.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const term = String(form.get("term") ?? "");
  const course = String(form.get("course") ?? "").trim().toUpperCase();
  removePlanEntry(term, course);
  return redirect(withNotice(safeBack(form.get("back")), `Removed ${course} from the plan.`), 303);
};
