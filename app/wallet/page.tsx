"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Header from "@/app/components/Header";

type Wallet = {
  id: string;
  currency: string;
  available_balance: number;
  locked_balance: number;
  is_paper: boolean;
};

export default function WalletPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaperMode, setIsPaperMode] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_paper_mode")
        .eq("id", user.id)
        .single();

      const paperMode = profile?.is_paper_mode ?? false;
      setIsPaperMode(paperMode);

      await loadWallets(user.id, paperMode);
      setLoading(false);
    };

    init();
  }, [router]);

  const loadWallets = async (userId: string, paperMode: boolean) => {
    let { data: existingWallets } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .eq("is_paper", paperMode)
      .order("currency");

    if (!existingWallets || existingWallets.length === 0) {
      const defaultCurrencies = [
        "NGN", "USDT", "BTC", "ETH",
        "USD", "GBP", "GHS", "KES", "CAD"
      ];

      const newWallets = defaultCurrencies.map((currency) => ({
        user_id: userId,
        currency,
        available_balance: paperMode
          ? currency === "NGN" ? 5000000
            : currency === "USDT" ? 50000
            : currency === "BTC" ? 2
            : currency === "ETH" ? 10
            : currency === "USD" ? 5000
            : currency === "GBP" ? 3000
            : currency === "GHS" ? 50000
            : currency === "KES" ? 500000
            : currency === "CAD" ? 5000
            : 0
          : 0,
        locked_balance: 0,
        is_paper: paperMode,
      }));

      await supabase.from("wallets").upsert(newWallets, {
        onConflict: "user_id,currency,is_paper",
        ignoreDuplicates: true,
      });

      const { data } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .eq("is_paper", paperMode)
        .order("currency");

      existingWallets = data;
    }

    setWallets(existingWallets || []);
  };

  const togglePaperMode = async () => {
    if (!user) return;

    const newMode = !isPaperMode;

    await supabase
      .from("profiles")
      .update({ is_paper_mode: newMode })
      .eq("id", user.id);

    setIsPaperMode(newMode);
    setLoading(true);
    await loadWallets(user.id, newMode);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading wallet...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your balances across all currencies
            </p>
          </div>

          <button
            onClick={togglePaperMode}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              isPaperMode
                ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                : "bg-green-100 text-green-800 hover:bg-green-200"
            }`}
          >
            {isPaperMode ? "Paper Mode" : "Real Mode"}
          </button>
        </div>

        {/* Wallets Grid */}
        {wallets.length === 0 ? (
          <div className="bg-white rounded-2xl border shadow-sm p-12 text-center">
            <p className="text-gray-500">No wallets found. Try refreshing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {wallet.currency}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Available</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {Number(wallet.available_balance).toLocaleString(undefined, {
                        maximumFractionDigits: 8,
                      })}
                    </p>
                    {Number(wallet.locked_balance) > 0 && (
                      <p className="text-xs text-orange-500 mt-1">
                        Locked: {Number(wallet.locked_balance).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}