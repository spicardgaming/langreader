import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CancelRequest = {
  userId: string;
};

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Supabase configuration is missing" },
      { status: 500 },
    );
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let body: CancelRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId } = body;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", userId)
    .single();

  if (fetchError || !profile || !profile.stripe_subscription_id) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 400 },
    );
  }

  try {
    const updatedSubscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      { cancel_at_period_end: true },
    );

    // Note: we deliberately do NOT downgrade profiles.plan or clear
    // stripe_subscription_id here. The person keeps Pro access until the
    // subscription actually ends — Stripe fires `customer.subscription.deleted`
    // at that point, and the webhook handles the downgrade then.
    //
    // We DO save the scheduled end date right away (rather than waiting for the
    // webhook) so the UI can show "cancels on <date>" immediately.
    const currentPeriodEnd =
      (updatedSubscription as any).items?.data?.[0]?.current_period_end ??
      (updatedSubscription as any).current_period_end;

    if (currentPeriodEnd) {
      await supabase
        .from("profiles")
        .update({
          subscription_cancel_at: new Date(currentPeriodEnd * 1000).toISOString(),
        })
        .eq("id", userId);
    } else {
      console.warn("Could not determine current_period_end for subscription", profile.stripe_subscription_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to cancel subscription", details: String(error) },
      { status: 500 },
    );
  }
}