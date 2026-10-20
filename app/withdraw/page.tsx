"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Header from "@/app/components/Header";

export default function WithdrawPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPaperMode, setIsPaperMode] = useState(false);
  const [currency, setCurrency] = useState("NGN");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState(0);
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

      const paperMode = profile?.is_paper_mode ?? false;
      setIsPaperMode(paperMode);
      setLoading(false);
    };

    init();
  }, [router]);

  // Load balance when currency changes
  useEffect(() => {
    if (!user) return;

    const loadBalance = async () => {
      const { data } = await supabase
        .from("wallets")
        .select("available_balance")
        .eq("user_id", user.id)
        .eq("currency", currency)
        .eq("is_paper", isPaperMode)
        .single();

      setBalance(Number(data?.available_balance || 0));
    };

    loadBalance();
  }, [user, currency, isPaperMode]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setMessage("Please enter a valid amount");
      return;
    }

    if (withdrawAmount > balance) {
      setMessage(`Insufficient ${currency} balance`);
      return;
    }

    if (!address.trim()) {
      setMessage("Please enter a withdrawal address / account details");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      // Deduct balance
      await supabase
        .from("wallets")
        .update({
          available_balance: balance - withdrawAmount,
        })
        .eq("user_id", user.id)
        .eq("currency", currency)
        .eq("is_paper", isPaperMode);

      // Record transaction
      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "withdraw",
        currency,
        amount: -withdrawAmount,
        status: isPaperMode ? "completed" : "pending",
        is_paper: isPaperMode,
      });

      setMessage(
        isPaperMode
          ? `Successfully withdrew ${withdrawAmount.toLocaleString()} ${currency}`
          : `Withdrawal request of ${withdrawAmount.toLocaleString()} ${currency} submitted. Pending approval.`
      );
      setAmount("");
      setAddress("");
      setBalance(balance - withdrawAmount);
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
          <h1 className="text-2xl font-bold text-gray-900">Withdraw</h1>
          <p className="text-sm text-gray-500 mt-1">
            Withdraw funds from your {isPaperMode ? "Paper" : "Real"} wallet
          </p>
        </div>

        {isPaperMode && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl mb-6 text-sm">
            You are in <strong>Paper Mode</strong>. This withdrawal is for testing only.
          </div>
        )}

        {!isPaperMode && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl mb-6 text-sm">
            <strong>Note:</strong> Real withdrawals are currently processed manually.
          </div>
        )}

        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <form onSubmit={handleWithdraw} className="space-y-5">
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

            {/* Available Balance */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
              Available Balance:{" "}
              <span className="font-semibold">
                {balance.toLocaleString(undefined, { maximumFractionDigits: 8 })} {currency}
              </span>
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

            {/* Address / Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {currency === "NGN" || currency === "USD" || currency === "GBP" || currency === "GHS" || currency === "KES" || currency === "CAD"
                  ? "Bank Account / Details"
                  : "Wallet Address"}
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                placeholder={
                  currency === "NGN"
                    ? "Bank name, Account number, Account name"
                    : "Paste wallet address"
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {message && (
              <div
                className={`text-sm p-3 rounded-xl ${
                  message.includes("Error") || message.includes("Insufficient")
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
              className="w-full bg-red-600 text-white py-3.5 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition"
            >
              {submitting ? "Processing..." : "Withdraw Now"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-sm text-gray-500 space-y-2">
          <p>• Double-check the address / account details before withdrawing.</p>
          <p>• Paper Mode withdrawals are instant for testing.</p>
        </div>
      </main>
    </div>
  );
}