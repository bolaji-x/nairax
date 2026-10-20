"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Header from "@/app/components/Header";

export default function DepositPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPaperMode, setIsPaperMode] = useState(false);
  const [currency, setCurrency] = useState("NGN");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currencies = ["NGN", "USDT", "BTC", "ETH", "USD", "GBP", "GHS", "KES", "CAD"];

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

      setIsPaperMode(profile?.is_paper_mode ?? false);
      setLoading(false);
    };

    init();
  }, [router]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setMessage("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      // Get current wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("available_balance")
        .eq("user_id", user.id)
        .eq("currency", currency)
        .eq("is_paper", isPaperMode)
        .single();

      const currentBalance = Number(wallet?.available_balance || 0);

      // Update balance
      await supabase
        .from("wallets")
        .update({
          available_balance: currentBalance + depositAmount,
        })
        .eq("user_id", user.id)
        .eq("currency", currency)
        .eq("is_paper", isPaperMode);

      // Record transaction
      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "deposit",
        currency,
        amount: depositAmount,
        status: "completed",
        is_paper: isPaperMode,
      });

      setMessage(`Successfully deposited ${depositAmount.toLocaleString()} ${currency}`);
      setAmount("");
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Deposit</h1>
          <p className="text-sm text-gray-500 mt-1">
            Add funds to your {isPaperMode ? "Paper" : "Real"} wallet
          </p>
        </div>

        {isPaperMode && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl mb-6 text-sm">
            You are in <strong>Paper Mode</strong>. This deposit is for testing only.
          </div>
        )}

        {!isPaperMode && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl mb-6 text-sm">
            <strong>Note:</strong> Real deposits are currently manual. Contact support after sending payment.
          </div>
        )}

        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <form onSubmit={handleDeposit} className="space-y-5">
            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Amount
              </label>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {message && (
              <div
                className={`text-sm p-3 rounded-xl ${
                  message.includes("Error")
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {submitting ? "Processing..." : "Deposit Now"}
            </button>
          </form>
        </div>

        {/* Info */}
        <div className="mt-6 text-sm text-gray-500 space-y-2">
          <p>• Paper Mode deposits are instant and free for testing.</p>
          <p>• Real Mode deposits will be confirmed manually for now.</p>
        </div>
      </main>
    </div>
  );
}