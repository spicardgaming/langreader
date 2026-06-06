"use client";

export default function ContactsPage() {
  return (
    <div className="max-w-[700px] mx-auto py-12 px-4">
      <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-6">Contacts</h1>
      <p className="text-sm leading-relaxed text-[#57534e] mb-4">
        Have a question or suggestion? Write to us:
      </p>
      <a
        href="mailto:support@balaka.app"
        className="text-[#2c2c2c] underline underline-offset-2 hover:opacity-70"
      >
        support@balaka.app
      </a>
    </div>
  );
}
