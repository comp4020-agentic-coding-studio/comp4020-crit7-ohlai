import type { APIRoute } from "astro";
import { addPlanEntry } from "../../lib/db";
import { safeBack, withNotice } from "../../lib/view";

// Adds a course to a semester of the plan. A plain form POSTs here and the
// 303 sends the browser back to the page it came from, re-rendered from the
// database.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const term = String(form.get("term") ?? "");
  const course = String(form.get("course") ?? "").trim().toUpperCase();
  const back = safeBack(form.get("back"));
  const result = addPlanEntry(term, course);
  return redirect(
    result.ok ? withNotice(back, `Added ${course} to the plan.`) : withNotice(back, result.reason, "error"),
    303,
  );
};
