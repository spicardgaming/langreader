export default function Footer() {
  return (
    <footer className="border-t border-[#e7e5e4] pt-8 pb-4">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-sm text-[#78716c]">Share:</p>
          <div className="flex gap-4 text-sm">
            <a
              href="#"
              className="text-[#57534e] underline-offset-2 hover:text-[#1a1a1a] hover:underline"
            >
              Facebook
            </a>
            <a
              href="#"
              className="text-[#57534e] underline-offset-2 hover:text-[#1a1a1a] hover:underline"
            >
              Twitter
            </a>
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <a
            href="#"
            className="text-[#57534e] underline-offset-2 hover:text-[#1a1a1a] hover:underline"
          >
            About us
          </a>
          <a
            href="#"
            className="text-[#57534e] underline-offset-2 hover:text-[#1a1a1a] hover:underline"
          >
            Contacts
          </a>
          <a
            href="#"
            className="text-[#57534e] underline-offset-2 hover:text-[#1a1a1a] hover:underline"
          >
            Your feedback
          </a>
        </nav>
      </div>
    </footer>
  );
}
