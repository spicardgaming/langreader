"use client";
import Link from "next/link";

export default function PricingPage() {
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
          <h2 className="text-lg font-semibold text-[#1a1a1a] mb-2">Pro</h2>
          <p className="text-sm text-[#78716c] mb-4">$4.99 / month</p>
          <ul className="space-y-2 mb-4">
            <li className="text-sm text-[#57534e]">✓ Everything in Free</li>
            <li className="text-sm text-[#57534e]">✓ Upload your own texts to read</li>
            <li className="text-sm text-[#57534e]">
              ✓ Simplified retelling of uploaded texts (safe time, read easy)
            </li>
            <li className="text-sm text-[#57534e]">
              ✓ epub, txt, pdf formats
            </li>
            <li className="text-sm text-[#57534e]">✓ Export cards</li>
            <li className="text-sm text-[#57534e]">✓ Unlimited saved words</li>
          </ul>
          <a
            href="#"
            className="block rounded bg-[#2c2c2c] px-4 py-2 text-sm font-medium text-white hover:opacity-90 w-full mt-4 text-center"
          >
            Upgrade to Pro
          </a>
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
          <a
            href="#"
            className="block rounded bg-[#2c2c2c] px-4 py-2 text-sm font-medium text-white hover:opacity-90 w-full mt-4 text-center"
          >
            Donate
          </a>
        </div>
      </div>

      <p className="text-xs text-[#a8a29e] text-center mt-6">
        Payments are handled securely via Stripe. Cancel anytime.
      </p>
    </div>
  );
}
