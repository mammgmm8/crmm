import {createClient} from "npm:@supabase/supabase-js@2";
import {deliverImpactReport, type ClaimedReport} from "./impact-report.ts";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {"Content-Type": "application/json", "Cache-Control": "no-store"},
  });
}

function secretsMatch(expected: string, provided: string) {
  if (expected.length !== provided.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ provided.charCodeAt(index);
  }
  return mismatch === 0;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({error: "Method not allowed"}, 405);

  const expectedSecret = Deno.env.get("WORKFLOW_CRON_SECRET") ?? "";
  const providedSecret = request.headers.get("x-workflow-cron-secret") ?? "";
  if (expectedSecret.length < 32 || !secretsMatch(expectedSecret, providedSecret)) {
    return json({error: "Unauthorized"}, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({error: "Worker is not configured"}, 503);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false},
  });
  const {data, error} = await supabase.rpc("process_workflow_tasks");
  if (error) return json({error: "Workflow processing failed"}, 500);

  const {data: reports, error: claimError} = await supabase.rpc("claim_impact_reports");
  if (claimError) return json({error: "Impact report processing failed"}, 500);

  let sentReports = 0;
  let failedReports = 0;
  const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const fromEmail = Deno.env.get("IMPACT_REPORT_FROM_EMAIL") ?? "";
  for (const report of (reports ?? []) as ClaimedReport[]) {
    try {
      if (!resendApiKey || !fromEmail) throw new Error("Impact email delivery is not configured");
      const providerId = await deliverImpactReport(report, resendApiKey, fromEmail);
      const {error: sentError} = await supabase.rpc("mark_impact_report_sent", {
        target_report_id: report.report_id,
        provider_id: providerId,
      });
      if (sentError) throw sentError;
      sentReports += 1;
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : "Unknown report delivery error";
      await supabase.rpc("mark_impact_report_failed", {
        target_report_id: report.report_id,
        failure_reason: reason,
      });
      failedReports += 1;
    }
  }

  return json({ok: true, ...data, impactReports: {sent: sentReports, failed: failedReports}});
});