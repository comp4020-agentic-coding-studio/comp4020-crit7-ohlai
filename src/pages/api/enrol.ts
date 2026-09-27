import type { APIRoute } from "astro";
import { enrol } from "../../lib/enrol";
import { safeBack, withNotice } from "../../lib/view";

// Manual enrolment. Refuses what ISIS would refuse, and says why.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const term = String(form.get("term") ?? "");
  const course = String(form.get("course") ?? "").trim().toUpperCase();
  const back = safeBack(form.get("back"), "/courses/");
  const result = enrol(term, course, "manual");
  return redirect(
    result.ok ? withNotice(back, `Enrolled in ${course}.`) : withNotice(back, result.reason, "error"),
    303,
  );
};
