"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Header from "@/app/components/Header";
import { getLivePrices } from "@/app/lib/prices";

type Transaction = {
  id: string;
  type: string;
  currency: string;
  amount: number;
  status: string;
  created_at: string;
  is_paper: boolean;
};

export default function SwapPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPaperMode, setIsPaperMode] = useState(false);
  const [fromCurrency, setFromCurrency] = useState("USDT");
  const [toCurrency, setToCurrency] = useState("NGN");
  const [amount, setAmount] = useState("");
  const [fromBalance, setFromBalance] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [recentSwaps, setRecentSwaps] = useState<Transaction[]>([]);
  const [livePrices, setLivePrices] = useState<any>(null);

  const currencies = ["BTC", "ETH", "USDT", "NGN", "USD", "GBP", "GHS", "KES", "CAD"];

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

      await loadRecentSwaps(user.id, paperMode);

      // Load live prices
      const prices = await getLivePrices();
      setLivePrices(prices);

      setLoading(false);
    };

    init();
  }, [router]);

  // Refresh live prices every 60 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const prices = await getLivePrices();
      if (prices) setLivePrices(prices);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadRecentSwaps = async (userId: string, paperMode: boolean) => {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .eq("type", "swap")
      .eq("is_paper", paperMode)
      .order("created_at", { ascending: false })
      .limit(10);

    setRecentSwaps(data || []);
  };

  useEffect(() => {
    if (!user) return;

    const loadBalance = async () => {
      const { data } = await supabase
        .from("wallets")
        .select("available_balance")
        .eq("user_id", user.id)
        .eq("currency", fromCurrency)
        .eq("is_paper", isPaperMode)
        .single();

      setFromBalance(Number(data?.available_balance || 0));
    };

    loadBalance();
  }, [user, fromCurrency, isPaperMode]);

  // Calculate rate using live prices + small spread
  const getRate = () => {
    if (!livePrices) return null;

    const spread = 0.01; // 1% spread (you earn this)

    // Helper to get USD value of a currency
    const getUsdValue = (currency: string) => {
      if (currency === "BTC") return livePrices.BTC.usd;
      if (currency === "ETH") return livePrices.ETH.usd;
      if (currency === "USDT" || currency === "USD") return 1;
      if (currency === "NGN") return 1 / (livePrices.USDT.ngn || 1600);
      // Approximate for other fiats (you can improve later)
      if (currency === "GBP") return 1.27;
      if (currency === "GHS") return 1 / 15.5;
      if (currency === "KES") return 1 / 129;
      if (currency === "CAD") return 0.73;
      return 0;
    };

    const fromUsd = getUsdValue(fromCurrency);
    const toUsd = getUsdValue(toCurrency);

    if (!fromUsd || !toUsd) return null;

    // How many 'to' currency you get for 1 'from'
    const rate = (fromUsd / toUsd) * (1 - spread);
    return rate;
  };

  const calculateReceive = () => {
    const rate = getRate();
    if (!rate || !amount) return 0;

    const input = parseFloat(amount);
    if (isNaN(input) || input <= 0) return 0;

    return input * rate;
  };

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const inputAmount = parseFloat(amount);
    if (isNaN(inputAmount) || inputAmount <= 0) {
      setMessage("Enter a valid amount");
      return;
    }

    if (inputAmount > fromBalance) {
      setMessage(`Insufficient ${fromCurrency} balance`);
      return;
    }

    const rate = getRate();
    if (!rate) {
      setMessage("Unable to get live rate");
      return;
    }

    const receiveAmount = calculateReceive();
    if (receiveAmount <= 0) {
      setMessage("Invalid receive amount");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      // Deduct from currency
      await supabase
        .from("wallets")
        .update({ available_balance: fromBalance - inputAmount })
        .eq("user_id", user.id)
        .eq("currency", fromCurrency)
        .eq("is_paper", isPaperMode);

      // Add to currency
      const { data: toWallet } = await supabase
        .from("wallets")
        .select("available_balance")
        .eq("user_id", user.id)
        .eq("currency", toCurrency)
        .eq("is_paper", isPaperMode)
        .single();

      const currentToBalance = Number(toWallet?.available_balance || 0);

      await supabase
        .from("wallets")
        .update({ available_balance: currentToBalance + receiveAmount })
        .eq("user_id", user.id)
        .eq("currency", toCurrency)
        .eq("is_paper", isPaperMode);

      // Record transactions
      await supabase.from("transactions").insert([
        {
          user_id: user.id,
          type: "swap",
          currency: fromCurrency,
          amount: -inputAmount,
          status: "completed",
          is_paper: isPaperMode,
        },
        {
          user_id: user.id,
          type: "swap",
          currency: toCurrency,
          amount: receiveAmount,
          status: "completed",
          is_paper: isPaperMode,
        },
      ]);

      setMessage(
        `Successfully swapped ${inputAmount} ${fromCurrency} → ${receiveAmount.toFixed(6)} ${toCurrency}`
      );
      setAmount("");
      setFromBalance(fromBalance - inputAmount);
      await loadRecentSwaps(user.id, isPaperMode);
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }

    setSubmitting(false);
  };

  const switchCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setAmount("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading swap...</p>
      </div>
    );
  }

  const receiveAmount = calculateReceive();
  const rate = getRate();

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Instant Swap</h1>

        {isPaperMode && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 text-sm">
            You are in <strong>Paper Mode</strong>
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <form onSubmit={handleSwap} className="space-y-5">
            {/* From */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <label className="font-medium">From</label>
                <span className="text-gray-500">
                  Balance: {fromBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </span>
              </div>
              <div className="flex gap-3">
                <select
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2.5 bg-gray-50 font-medium"
                >
                  {currencies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Switch */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={switchCurrencies}
                className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full text-lg"
              >
                ⇅
              </button>
            </div>

            {/* To */}
            <div>
              <label className="block text-sm font-medium mb-1">To</label>
              <div className="flex gap-3">
                <select
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2.5 bg-gray-50 font-medium"
                >
                  {currencies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="flex-1 border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-gray-700">
                  {receiveAmount > 0
                    ? receiveAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })
                    : "0.00"}
                </div>
              </div>
            </div>

            {/* Rate Info */}
            {rate && (
              <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg">
                <p>
                  Live Rate: 1 {fromCurrency} ≈ {rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toCurrency}
                </p>
                <p className="text-xs mt-1">Includes 1% spread</p>
              </div>
            )}

            {!rate && (
              <div className="bg-yellow-50 text-yellow-800 text-sm p-3 rounded-lg">
                Loading live rate...
              </div>
            )}

            {message && (
              <div
                className={`text-sm p-3 rounded-lg ${
                  message.includes("Error") || message.includes("Insufficient")
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !rate || fromCurrency === toCurrency}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Swapping..." : "Swap Now"}
            </button>
          </form>
        </div>

        {/* Recent Swaps */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold mb-4">Recent Swaps</h2>

          {recentSwaps.length === 0 ? (
            <p className="text-sm text-gray-500">No swaps yet</p>
          ) : (
            <div className="space-y-3">
              {recentSwaps.map((tx) => (
                <div
                  key={tx.id}
                  className="flex justify-between items-center text-sm border-b pb-2 last:border-0"
                >
                  <div>
                    <span className={Number(tx.amount) >= 0 ? "text-green-600" : "text-red-600"}>
                      {Number(tx.amount) >= 0 ? "+" : ""}
                      {Number(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
                      {tx.currency}
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs">
                    {new Date(tx.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}