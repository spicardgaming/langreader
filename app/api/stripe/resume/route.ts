import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ResumeRequest = {
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

  let body: ResumeRequest;
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
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    // Optimistic — the customer.subscription.updated webhook will also clear
    // this (cancel_at_period_end is now false, so it computes subscription_cancel_at
    // as null), but update it here too for instant UI feedback.
    await supabase
      .from("profiles")
      .update({ subscription_cancel_at: null })
      .eq("id", userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to resume subscription", details: String(error) },
      { status: 500 },
    );
  }
}