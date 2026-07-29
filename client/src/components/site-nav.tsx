import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ChevronDown, Menu, X } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/hooks/use-auth";

const dapprLogo = "/dapr-logo.svg";

/** active page hint — highlights the matching nav link */
type ActivePage = "home" | "fleets" | "become-a-pro" | "help" | "about" | "";

interface SiteNavProps {
  active?: ActivePage;
}

export default function SiteNav({ active = "" }: SiteNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const aboutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!aboutOpen) return;
    const onClick = (e: MouseEvent) => {
      if (aboutRef.current && !aboutRef.current.contains(e.target as Node))
        setAboutOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [aboutOpen]);

  const nav = (path: string) => {
    setMobileOpen(false);
    setLocation(path);
  };

  const linkCls = (page: ActivePage) =>
    `hover:text-black transition-colors ${active === page ? "text-black font-bold" : "text-gray-600"}`;

  return (
    <>
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 border-b border-gray-100 ${
          scrolled ? "bg-white/95 backdrop-blur-md shadow-sm" : "bg-white"
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Left — logo + links */}
          <div className="flex items-center gap-8">
            <button onClick={() => nav("/")} aria-label="Dapr home" className="shrink-0">
              <img src={dapprLogo} alt="Dapr" className="h-20 w-auto" />
            </button>
            <div className="hidden lg:flex items-center gap-6 text-sm font-medium">
              <button onClick={() => nav("/corporate")} className={linkCls("fleets")}>
                For Fleets
              </button>
              <button onClick={() => nav("/become-a-pro")} className={linkCls("become-a-pro")}>
                Become a Pro
              </button>

              {/* About dropdown */}
              <div className="relative" ref={aboutRef}>
                <button
                  onClick={() => setAboutOpen((o) => !o)}
                  className={`flex items-center gap-1 ${linkCls("about")}`}
                >
                  About
                  <Icon
                    icon={ChevronDown}
                    size="xs"
                    className={`transition-transform ${aboutOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {aboutOpen && (
                  <div className="absolute top-full mt-2 left-0 bg-white border border-gray-100 rounded-2xl shadow-lg py-2 w-44 z-50">
                    {[
                      { label: "Offers", path: "/first-wash-offer" },
                      { label: "Careers", path: "/careers" },
                      { label: "Blog", path: "/blog" },
                      { label: "About Us", path: "/about" },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => { setAboutOpen(false); nav(item.path); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-black transition-colors"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => nav("/faq")} className={linkCls("help")}>
                Help
              </button>
            </div>
          </div>

          {/* Right — auth */}
          <div className="hidden lg:flex items-center gap-4">
            {user ? (
              <button
                onClick={() => nav("/profile")}
                className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
              >
                My Account
              </button>
            ) : (
              <button
                onClick={() => nav("/auth")}
                className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
              >
                Log in
              </button>
            )}
            <button
              onClick={() => nav("/auth")}
              className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-gray-900 transition-colors"
            >
              Create account
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <Icon icon={mobileOpen ? X : Menu} size="md" className="text-black" />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-16 overflow-y-auto">
          <div className="px-6 py-8 space-y-1">
            {[
              { label: "For Fleets", path: "/corporate" },
              { label: "Become a Pro", path: "/become-a-pro" },
              { label: "About Us", path: "/about" },
              { label: "Offers", path: "/first-wash-offer" },
              { label: "Help", path: "/faq" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => nav(item.path)}
                className="w-full text-left px-4 py-4 text-lg font-medium text-gray-800 hover:bg-gray-50 rounded-xl transition-colors"
              >
                {item.label}
              </button>
            ))}
            <div className="pt-6 space-y-3">
              <button
                onClick={() => nav("/auth")}
                className="w-full py-3.5 rounded-full border border-gray-200 text-base font-bold text-black hover:bg-gray-50 transition-colors"
              >
                Log in
              </button>
              <button
                onClick={() => nav("/auth")}
                className="w-full py-3.5 rounded-full bg-black text-white text-base font-bold hover:bg-gray-900 transition-colors"
              >
                Create account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
