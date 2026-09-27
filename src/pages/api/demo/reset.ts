import type { APIRoute } from "astro";
import { demoReset } from "../../../lib/auto-enrol";
import { listTerms } from "../../../lib/db";
import { withNotice } from "../../../lib/view";

// Demo only: puts a semester's real window back and undoes its enrolments.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const termId = String(form.get("term") ?? "");
  const term = listTerms().find((t) => t.id === termId);
  if (!term || term.seededOpensAt <= new Date().toISOString()) {
    return redirect(
      withNotice("/enrolment/", "The demo only resets windows that have not really opened.", "error"),
      303,
    );
  }
  demoReset(termId);
  return redirect(withNotice(`/enrolment/#window-${termId}`, "Demo: the window is back to its real date."), 303);
};
