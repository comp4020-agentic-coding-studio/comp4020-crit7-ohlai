import type { APIRoute } from "astro";
import { setAutoEnrol } from "../../lib/auto-enrol";
import { listTerms } from "../../lib/db";
import { withNotice } from "../../lib/view";

// Turns "enrol me from my plan" on or off for one semester.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const term = String(form.get("term") ?? "");
  if (!listTerms().some((t) => t.id === term)) {
    return redirect(withNotice("/enrolment/", `There is no semester ${term}.`, "error"), 303);
  }
  const enabled = form.get("enabled") === "true";
  setAutoEnrol(term, enabled);
  return redirect(
    withNotice(`/enrolment/#window-${term}`, `Enrol me from my plan is ${enabled ? "on" : "off"}.`),
    303,
  );
};
