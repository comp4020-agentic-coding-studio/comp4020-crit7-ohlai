import type { APIRoute } from "astro";
import { drop } from "../../lib/enrol";
import { safeBack, withNotice } from "../../lib/view";

// Drops an enrolment while its window is open. The plan entry, if any,
// stays: the course goes back to planned.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const term = String(form.get("term") ?? "");
  const course = String(form.get("course") ?? "").trim().toUpperCase();
  const back = safeBack(form.get("back"), "/enrolment/");
  const result = drop(term, course);
  return redirect(
    result.ok ? withNotice(back, `Dropped ${course}.`) : withNotice(back, result.reason, "error"),
    303,
  );
};
