"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AccountTabs from "@/app/components/AccountTabs";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ plan: string; subscription_cancel_at: string | null } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancelState, setCancelState] = useState<"idle" | "cancelling">("idle");

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/auth");
        return;
      }

      setUserEmail(data.session.user.email || null);
      setUserId(data.session.user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("plan, subscription_cancel_at")
        .eq("id", data.session.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      setLoading(false);
    }

    checkSession();
  }, [router]);

  const handleUpgrade = async () => {
    if (!userId) return;
    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
          userId,
          email: userEmail,
        }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!userId) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel your Pro subscription? You'll keep Pro access until the end of your current billing period, and it won't renew after that."
    );
    if (!confirmed) return;

    setCancelState("cancelling");

    try {
      const response = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("plan, subscription_cancel_at")
          .eq("id", userId)
          .single();

        if (profileData) {
          setProfile(profileData);
        }
        window.alert("Your subscription will end at the close of your current billing period. You'll keep Pro access until then.");
      } else {
        window.alert("Something went wrong. Please try again or contact support.");
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      window.alert("Something went wrong. Please try again or contact support.");
    } finally {
      setCancelState("idle");
    }
  };

  const handleResumeSubscription = async () => {
    if (!userId) return;

    setCancelState("cancelling");

    try {
      const response = await fetch('/api/stripe/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        setProfile((prev) => (prev ? { ...prev, subscription_cancel_at: null } : prev));
        window.alert("Your subscription has been resumed. It will continue as normal.");
      } else {
        window.alert("Something went wrong. Please try again or contact support.");
      }
    } catch (error) {
      console.error('Resume subscription error:', error);
      window.alert("Something went wrong. Please try again or contact support.");
    } finally {
      setCancelState("idle");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#57534e]">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold text-[#1a1a1a]">My account</h1>
      <AccountTabs />

      <div className="mb-8 flex flex-col gap-4 rounded-lg border border-[#e7e5e4] bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-[#78716c]">Email:</p>
          <p className="mt-1 text-base text-[#1a1a1a]">{userEmail}</p>
        </div>
        <div className="flex items-center gap-4">
          {profile?.plan === 'free' && (
            <button
              onClick={handleUpgrade}
              disabled={checkoutLoading}
              className="rounded bg-[#2c2c2c] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {checkoutLoading ? 'Loading...' : 'Upgrade to read your texts'}
            </button>
          )}
          {profile?.plan === 'pro' && !profile.subscription_cancel_at && (
            <button
              onClick={handleCancelSubscription}
              disabled={cancelState === 'cancelling'}
              className="text-sm text-[#78716c] underline hover:text-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelState === 'cancelling' ? 'Cancelling...' : 'Cancel Pro account'}
            </button>
          )}
          {profile?.plan === 'pro' && profile.subscription_cancel_at && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#78716c]">
                Pro (cancels on{' '}
                {new Date(profile.subscription_cancel_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                )
              </span>
              <button
                onClick={handleResumeSubscription}
                disabled={cancelState === 'cancelling'}
                className="text-sm text-[#1a1a1a] underline hover:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelState === 'cancelling' ? 'Resuming...' : 'Resume subscription'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
