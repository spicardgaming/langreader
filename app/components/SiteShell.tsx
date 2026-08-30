"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

// Routes that render their own full-width header/footer instead of the
// standard site chrome. Add "/" here once the real landing page replaces
// the current homepage.
const NO_CHROME_ROUTES = ["/"];

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBareRoute = NO_CHROME_ROUTES.includes(pathname);

  if (isBareRoute) {
    return (
      <>
        {children}
        <Footer />
      </>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[900px] flex-col px-4 py-8 sm:px-6">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
