"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Header from "@/app/components/Header";

type Transaction = {
  id: string;
  type: string;
  currency: string;
  amount: number;
  status: string;
  created_at: string;
  is_paper: boolean;
};

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaperMode, setIsPaperMode] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_paper_mode")
        .eq("id", user.id)
        .single();

      const paperMode = profile?.is_paper_mode ?? false;
      setIsPaperMode(paperMode);

      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_paper", paperMode)
        .order("created_at", { ascending: false })
        .limit(50);

      setTransactions(data || []);
      setLoading(false);
    };

    init();
  }, [router]);

  const filtered = transactions.filter((tx) => {
    if (filter === "all") return true;
    return tx.type === filter;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "deposit":
        return "bg-green-100 text-green-800";
      case "withdraw":
        return "bg-red-100 text-red-800";
      case "swap":
        return "bg-blue-100 text-blue-800";
      case "trading_fee":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading transactions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="text-sm text-gray-500 mt-1">
              Your recent activity ({isPaperMode ? "Paper Mode" : "Real Mode"})
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {["all", "deposit", "withdraw", "swap", "trading_fee"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border hover:bg-gray-50"
              }`}
            >
              {f === "all" ? "All" : f.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No transactions found
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getTypeColor(
                        tx.type
                      )}`}
                    >
                      {tx.type.replace("_", " ")}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {Number(tx.amount) > 0 ? "+" : ""}
                        {Number(tx.amount).toLocaleString(undefined, {
                          maximumFractionDigits: 8,
                        })}{" "}
                        {tx.currency}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      tx.status === "completed"
                        ? "bg-green-50 text-green-700"
                        : tx.status === "pending"
                        ? "bg-yellow-50 text-yellow-700"
                        : "bg-gray-50 text-gray-600"
                    }`}
                  >
                    {tx.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}