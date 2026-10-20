"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const mainLinks = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Trade", href: "/trade" },
    { name: "Swap", href: "/swap" },
    { name: "P2P", href: "/p2p" },
    { name: "Wallet", href: "/wallet" },
  ];

  const moreLinks = [
    { name: "Deposit", href: "/deposit" },
    { name: "Withdraw", href: "/withdraw" },
    { name: "My Ads", href: "/p2p/my-ads" },
    { name: "My Orders", href: "/p2p/my-orders" },
    { name: "Transactions", href: "/transactions" },
    { name: "Profile", href: "/profile" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/dashboard" className="font-bold text-xl text-blue-600">
            NairaX
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive(link.href)
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {link.name}
              </Link>
            ))}

            {/* More dropdown */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                More ▾
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white border rounded-xl shadow-lg py-2 z-50">
                  {moreLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`block px-4 py-2 text-sm ${
                        isActive(link.href)
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {link.name}
                    </Link>
                  ))}
                  <div className="border-t my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-gray-600"
          >
            ☰
          </button>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden border-t py-3 space-y-1">
            {[...mainLinks, ...moreLinks].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm ${
                  isActive(link.href)
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-700"
                }`}
              >
                {link.name}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 text-sm text-red-600"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}