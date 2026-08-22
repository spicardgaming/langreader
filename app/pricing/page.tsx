"use client";
import Link from "next/link";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID as string;
const YEARLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID as string;
const DONATE_PRICE_ID = 'price_1TmJBfHdn6x4W8DuJBvHhu3S';

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  async function handleCheckout(priceId: string) {
    setLoading(priceId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/auth';
        return;
      }
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: session.user.id,
          email: session.user.email,
        }),
      });
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(null);
    }
  }

  const proPriceId = billingPeriod === 'monthly' ? MONTHLY_PRICE_ID : YEARLY_PRICE_ID;

  return (
    <div className="max-w-[800px] mx-auto py-12 px-4">
      <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-6">
        Choose your plan
      </h1>
      <p className="text-sm text-[#78716c] mb-8">
        Start for free, upgrade when you need more.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* FREE Plan */}
        <div className="rounded-lg border border-[#e7e5e4] bg-white p-6">
          <h2 className="text-lg font-semibold text-[#1a1a1a] mb-2">Free</h2>
          <p className="text-sm text-[#78716c] mb-4">$0 / forever</p>
          <ul className="space-y-2 mb-4">
            <li className="text-sm text-[#57534e]">
              ✓ Read books from the library
            </li>
            <li className="text-sm text-[#57534e]">
              ✓ Save up to 100 words and phrases
            </li>
          </ul>
          <Link
            href="/auth"
            className="block rounded bg-[#2c2c2c] px-4 py-2 text-sm font-medium text-white hover:opacity-90 w-full mt-4 text-center"
          >
            Get started
          </Link>
        </div>

        {/* PRO Plan */}
        <div className="rounded-lg border border-[#2c2c2c] bg-white p-6 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-[#ecfdf5] text-[#047857] px-3 py-1 rounded-full text-xs font-medium">
              Most popular
            </span>
          </div>
          <h2 className="text-lg font-semibold text-[#1a1a1a] mb-3">Pro</h2>

          {/* Monthly / Yearly toggle — scoped to this card */}
          <div className="mb-3 inline-flex items-center rounded-full border border-[#e7e5e4] bg-[#fafaf9] p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-[#2c2c2c] text-white'
                  : 'text-[#57534e] hover:text-[#1a1a1a]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                billingPeriod === 'yearly'
                  ? 'bg-[#2c2c2c] text-white'
                  : 'text-[#57534e] hover:text-[#1a1a1a]'
              }`}
            >
              Yearly
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                  billingPeriod === 'yearly' ? 'bg-white/20 text-white' : 'bg-[#ecfdf5] text-[#047857]'
                }`}
              >
                2 mo free
              </span>
            </button>
          </div>

          {billingPeriod === 'monthly' ? (
            <p className="text-sm text-[#78716c] mb-4">$6.99 / month</p>
          ) : (
            <div className="mb-4">
              <p className="text-sm text-[#78716c]">$69.99 / year</p>
              <p className="text-xs text-[#a8a29e]">≈ $5.83 / month</p>
            </div>
          )}
          <ul className="space-y-2 mb-4">
            <li className="text-sm text-[#57534e]">✓ Everything in Free</li>
            <li className="text-sm text-[#57534e]">✓ Upload your own texts — .txt, .epub, or .pdf</li>
            <li className="text-sm text-[#57534e]">
              ✓ Simplified retelling of uploaded texts (save time, read easy)
            </li>
            <li className="text-sm text-[#57534e]">
              ✓ Up to 2,000,000 characters processed per month
            </li>
            <li className="text-sm text-[#57534e]">✓ Unlimited saved words</li>
            <li className="text-sm text-[#a8a29e]">
              Export cards <span className="text-xs">(coming soon)</span>
            </li>
          </ul>
          <button
            onClick={() => handleCheckout(proPriceId)}
            disabled={loading !== null && loading !== proPriceId}
            className="block rounded bg-[#2c2c2c] px-4 py-2 text-sm font-medium text-white hover:opacity-90 w-full mt-4 text-center disabled:opacity-50"
          >
            {loading === proPriceId ? 'Loading...' : 'Upgrade to Pro'}
          </button>
        </div>

        {/* SUPPORT Plan */}
        <div className="rounded-lg border border-[#e7e5e4] bg-white p-6">
          <h2 className="text-lg font-semibold text-[#1a1a1a] mb-2">
            Support us
          </h2>
          <p className="text-sm text-[#78716c] mb-4">Any amount</p>
          <p className="text-sm text-[#57534e] mb-4">
            Help us grow and add new languages, books, and features.
          </p>
          <button
            onClick={() => handleCheckout(DONATE_PRICE_ID)}
            disabled={loading !== null && loading !== DONATE_PRICE_ID}
            className="block rounded bg-[#2c2c2c] px-4 py-2 text-sm font-medium text-white hover:opacity-90 w-full mt-4 text-center disabled:opacity-50"
          >
            {loading === DONATE_PRICE_ID ? 'Loading...' : 'Donate'}
          </button>
        </div>
      </div>

      <p className="text-xs text-[#a8a29e] text-center mt-6">
        Payments are handled securely via Stripe. Cancel anytime — you'll keep Pro access until the end of your current billing period.
      </p>
    </div>
  );
}
