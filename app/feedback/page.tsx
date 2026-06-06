"use client";

export default function FeedbackPage() {
  return (
    <div className="max-w-[700px] mx-auto py-12 px-4">
      <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-6">
        Your feedback
      </h1>
      <p className="text-sm leading-relaxed text-[#57534e] mb-6">
        We read every message. Tell us what works, what doesn't, and what you'd
        like to see next.
      </p>
      <a
        href="#"
        className="inline-block rounded bg-[#2c2c2c] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Leave feedback
      </a>
    </div>
  );
}
