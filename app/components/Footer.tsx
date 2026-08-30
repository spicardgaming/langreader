import Link from "next/link";

const linkClass = "text-[13px] text-[#c7d6cf] hover:text-white transition-colors";
const HEADING = { fontFamily: "Georgia, 'Times New Roman', serif" };

export default function Footer() {
  return (
    <footer
      className="relative mt-20 bg-[#142f28] px-6 py-10 text-[#dbe4df] sm:px-8"
      style={{
        left: "50%",
        right: "50%",
        marginLeft: "-50vw",
        marginRight: "-50vw",
        width: "100vw",
      }}
    >
      <div className="mx-auto grid max-w-[1180px] gap-8 sm:grid-cols-[170px_1fr]">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold" style={HEADING}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ddea9d] text-sm font-bold text-[#173f35]">
              b
            </span>
            balaka
          </div>
          <p className="mt-3 max-w-[220px] text-sm leading-relaxed text-[#9eb0a9]" style={HEADING}>
            Learn a language through stories you actually want to read.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#738c82]">
              Product
            </p>
            <div className="flex flex-col gap-2.5">
              <Link href="/pricing" className={linkClass}>Pricing</Link>
            </div>
          </div>
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#738c82]">
              Company
            </p>
            <div className="flex flex-col gap-2.5">
              <Link href="/about" className={linkClass}>About us</Link>
              <Link href="/contacts" className={linkClass}>Contacts</Link>
              <Link href="/feedback" className={linkClass}>Your feedback</Link>
            </div>
          </div>
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#738c82]">
              Legal
            </p>
            <div className="flex flex-col gap-2.5">
              <Link href="/privacyPolicy" className={linkClass}>Privacy Policy</Link>
              <Link href="/termsOfService" className={linkClass}>Terms of Service</Link>
            </div>
          </div>
        </div>

        <div className="col-span-full mt-8 flex items-center justify-between border-t border-[#365047] pt-4 text-[11px] text-[#789087]">
          <span>© {new Date().getFullYear()} Balaka</span>
          <span>Made for language learners</span>
        </div>
      </div>
    </footer>
  );
}
