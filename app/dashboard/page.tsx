"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import Header from "@/app/components/Header";

type Wallet = {
  currency: string;
  available_balance: number;
  locked_balance: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaperMode, setIsPaperMode] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);
      const paperMode = profileData?.is_paper_mode ?? false;
      setIsPaperMode(paperMode);

      const { data: walletData } = await supabase
        .from("wallets")
        .select("currency, available_balance, locked_balance")
        .eq("user_id", user.id)
        .eq("is_paper", paperMode)
        .order("currency");

      setWallets(walletData || []);
      setLoading(false);
    };

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  const mainWallets = wallets.filter((w) =>
    ["NGN", "USDT", "BTC", "ETH"].includes(w.currency)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {profile?.full_name || user?.email?.split("@")[0]}
              </h1>
              <p className="text-gray-500 mt-1">
                Here’s what’s happening with your NairaX account today.
              </p>
            </div>

            <span
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                isPaperMode
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {isPaperMode ? "Paper Mode" : "Real Mode"}
            </span>
          </div>
        </div>

        {/* Wallet Overview */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Wallet Overview</h2>
            <Link href="/wallet" className="text-sm text-blue-600 hover:underline">
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {mainWallets.length === 0 ? (
              <p className="text-gray-500 col-span-4">No wallets found.</p>
            ) : (
              mainWallets.map((wallet) => (
                <div
                  key={wallet.currency}
                  className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition"
                >
                  <p className="text-sm text-gray-500 font-medium">{wallet.currency}</p>
                  <p className="text-xl font-bold mt-1 text-gray-900">
                    {Number(wallet.available_balance).toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })}
                  </p>
                  {Number(wallet.locked_balance) > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Locked: {Number(wallet.locked_balance).toLocaleString()}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/trade"
              className="bg-white border rounded-xl p-5 hover:shadow-md transition group"
            >
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-100">
                📈
              </div>
              <h3 className="font-semibold text-gray-900">Trade</h3>
              <p className="text-xs text-gray-500 mt-1">Spot trading</p>
            </Link>

            <Link
              href="/swap"
              className="bg-white border rounded-xl p-5 hover:shadow-md transition group"
            >
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-100">
                🔄
              </div>
              <h3 className="font-semibold text-gray-900">Swap</h3>
              <p className="text-xs text-gray-500 mt-1">Instant convert</p>
            </Link>

            <Link
              href="/p2p"
              className="bg-white border rounded-xl p-5 hover:shadow-md transition group"
            >
              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-100">
                🤝
              </div>
              <h3 className="font-semibold text-gray-900">P2P</h3>
              <p className="text-xs text-gray-500 mt-1">Buy & Sell</p>
            </Link>

            <Link
              href="/deposit"
              className="bg-white border rounded-xl p-5 hover:shadow-md transition group"
            >
              <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-orange-100">
                💰
              </div>
              <h3 className="font-semibold text-gray-900">Deposit</h3>
              <p className="text-xs text-gray-500 mt-1">Add funds</p>
            </Link>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium mt-0.5">{user?.email}</p>
            </div>
            <div>
              <p className="text-gray-500">KYC Level</p>
              <p className="font-medium mt-0.5">Level {profile?.kyc_level || 0}</p>
            </div>
            <div>
              <p className="text-gray-500">Member Since</p>
              <p className="font-medium mt-0.5">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}