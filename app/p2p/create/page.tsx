"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Header from "@/app/components/Header";

export default function CreateP2PAdPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isPaperMode, setIsPaperMode] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);

  const [type, setType] = useState<"buy" | "sell">("sell");
  const [currency, setCurrency] = useState("USDT");
  const [price, setPrice] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [minLimit, setMinLimit] = useState("");
  const [maxLimit, setMaxLimit] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [terms, setTerms] = useState("");

  const availablePayments = [
    "Bank Transfer",
    "Opay",
    "PalmPay",
    "Kuda",
    "Chipper Cash",
    "USSD",
  ];

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

  // Load balance when currency or type changes
  useEffect(() => {
    if (!user || type !== "sell") return;

    const loadBalance = async () => {
      const { data } = await supabase
        .from("wallets")
        .select("available_balance")
        .eq("user_id", user.id)
        .eq("currency", currency)
        .eq("is_paper", isPaperMode)
        .single();

      setAvailableBalance(Number(data?.available_balance || 0));
    };

    loadBalance();
  }, [user, currency, type, isPaperMode]);

  const togglePayment = (method: string) => {
    if (paymentMethods.includes(method)) {
      setPaymentMethods(paymentMethods.filter((m) => m !== method));
    } else {
      setPaymentMethods([...paymentMethods, method]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (paymentMethods.length === 0) {
      setMessage("Please select at least one payment method");
      return;
    }

    const priceNum = parseFloat(price);
    const totalNum = parseFloat(totalAmount);
    const minNum = parseFloat(minLimit);
    const maxNum = parseFloat(maxLimit);

    if (isNaN(priceNum) || priceNum <= 0) {
      setMessage("Enter a valid price");
      return;
    }
    if (isNaN(totalNum) || totalNum <= 0) {
      setMessage("Enter a valid total amount");
      return;
    }
    if (isNaN(minNum) || isNaN(maxNum) || minNum <= 0 || maxNum < minNum) {
      setMessage("Enter valid limits");
      return;
    }

    // Escrow check for Sell ads
    if (type === "sell") {
      if (totalNum > availableBalance) {
        setMessage(`Insufficient ${currency} balance. You have ${availableBalance}`);
        return;
      }
    }

    setSubmitting(true);
    setMessage("");

    try {
      // 1. Create the ad
      const { data: newAd, error } = await supabase
        .from("p2p_ads")
        .insert({
          user_id: user.id,
          type,
          currency,
          fiat_currency: "NGN",
          price: priceNum,
          total_amount: totalNum,
          available_amount: totalNum,
          min_limit: minNum,
          max_limit: maxNum,
          payment_methods: paymentMethods,
          terms: terms || null,
          is_active: true,
          is_paper: isPaperMode,
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Lock the crypto if it's a Sell ad (Escrow)
      if (type === "sell") {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("available_balance, locked_balance")
          .eq("user_id", user.id)
          .eq("currency", currency)
          .eq("is_paper", isPaperMode)
          .single();

        if (wallet) {
          await supabase
            .from("wallets")
            .update({
              available_balance: Number(wallet.available_balance) - totalNum,
              locked_balance: Number(wallet.locked_balance) + totalNum,
            })
            .eq("user_id", user.id)
            .eq("currency", currency)
            .eq("is_paper", isPaperMode);
        }
      }

      setMessage("Ad posted successfully! Crypto has been locked in escrow.");
      
      setTimeout(() => {
        router.push("/p2p");
      }, 1200);
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Post P2P Ad</h1>

        {isPaperMode && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 text-sm">
            You are posting in <strong>Paper Mode</strong>
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium mb-2">I want to</label>
              <div className="flex rounded-lg overflow-hidden border">
                <button
                  type="button"
                  onClick={() => setType("sell")}
                  className={`flex-1 py-2.5 font-medium ${
                    type === "sell" ? "bg-red-600 text-white" : "bg-gray-50 text-gray-600"
                  }`}
                >
                  Sell
                </button>
                <button
                  type="button"
                  onClick={() => setType("buy")}
                  className={`flex-1 py-2.5 font-medium ${
                    type === "buy" ? "bg-green-600 text-white" : "bg-gray-50 text-gray-600"
                  }`}
                >
                  Buy
                </button>
              </div>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium mb-1">Crypto</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5"
              >
                <option value="USDT">USDT</option>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
              </select>
            </div>

            {/* Show available balance for Sell ads */}
            {type === "sell" && (
              <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg">
                Available Balance: <strong>{availableBalance.toLocaleString()} {currency}</strong>
              </div>
            )}

            {/* Price */}
            <div>
              <label className="block text-sm font-medium mb-1">Price (NGN)</label>
              <input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5"
                placeholder="e.g. 1650"
                required
              />
            </div>

            {/* Total Amount */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Total Amount ({currency})
              </label>
              <input
                type="number"
                step="any"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5"
                placeholder="e.g. 100"
                required
              />
            </div>

            {/* Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Min Limit (NGN)</label>
                <input
                  type="number"
                  step="any"
                  value={minLimit}
                  onChange={(e) => setMinLimit(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5"
                  placeholder="5000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Limit (NGN)</label>
                <input
                  type="number"
                  step="any"
                  value={maxLimit}
                  onChange={(e) => setMaxLimit(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5"
                  placeholder="500000"
                  required
                />
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <label className="block text-sm font-medium mb-2">Payment Methods</label>
              <div className="flex flex-wrap gap-2">
                {availablePayments.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => togglePayment(method)}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${
                      paymentMethods.includes(method)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-50 text-gray-700 border-gray-300"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Terms */}
            <div>
              <label className="block text-sm font-medium mb-1">Terms (optional)</label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5"
                placeholder="Any special instructions..."
              />
            </div>

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
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Posting..." : "Post Ad"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}