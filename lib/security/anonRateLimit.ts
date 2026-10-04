import { createClient } from "@supabase/supabase-js";

const MONTHLY_LIMIT = 500;

function currentMonthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export async function checkAndIncrementAnonUsage(
  deviceId: string,
  kind: "translate" | "explain",
): Promise<{ allowed: boolean; remaining: number }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("anonRateLimit: Supabase service config missing, failing open");
    return { allowed: true, remaining: MONTHLY_LIMIT };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const monthStart = currentMonthStart();

  const { data: existing } = await supabase
    .from("anon_usage")
    .select("*")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (!existing || existing.month_start !== monthStart) {
    const { error } = await supabase.from("anon_usage").upsert({
      device_id: deviceId,
      month_start: monthStart,
      translate_count: kind === "translate" ? 1 : 0,
      explain_count: kind === "explain" ? 1 : 0,
      updated_at: new Date().toISOString(),
    });
    if (error) console.error("anonRateLimit upsert error:", error);
    return { allowed: true, remaining: MONTHLY_LIMIT - 1 };
  }

  const totalUsed = existing.translate_count + existing.explain_count;
  if (totalUsed >= MONTHLY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  const field = kind === "translate" ? "translate_count" : "explain_count";
  const { error } = await supabase
    .from("anon_usage")
    .update({ [field]: existing[field] + 1, updated_at: new Date().toISOString() })
    .eq("device_id", deviceId);
  if (error) console.error("anonRateLimit update error:", error);

  return { allowed: true, remaining: MONTHLY_LIMIT - totalUsed - 1 };
}