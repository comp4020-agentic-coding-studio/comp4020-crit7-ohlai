import type { APIRoute } from "astro";
import { demoOpenWindow } from "../../../lib/auto-enrol";
import { listTerms } from "../../../lib/db";
import { withNotice } from "../../../lib/view";

// Demo only: moves a future semester's window to now, or a minute from now.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const termId = String(form.get("term") ?? "");
  const delay = form.get("delay") === "60" ? 60 : 0;
  const term = listTerms().find((t) => t.id === termId);
  if (!term || term.seededOpensAt <= new Date().toISOString()) {
    return redirect(
      withNotice("/enrolment/", "The demo only moves windows that have not really opened.", "error"),
      303,
    );
  }
  demoOpenWindow(termId, delay);
  return redirect(
    withNotice(
      `/enrolment/#window-${termId}`,
      delay ? "Demo: the window opens in one minute." : "Demo: the window is open.",
    ),
    303,
  );
};
