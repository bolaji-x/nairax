"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Header from "@/app/components/Header";
import Link from "next/link";

export default function AdminProfitsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSwaps: 0,
    estimatedSwapProfit: 0,
    totalP2POrders: 0,
    completedP2P: 0,
  });

  const ADMIN_EMAIL = "hd0921329@gmail.com";

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        router.push("/dashboard");
        return;
      }

      await loadStats();
      setLoading(false);
    };

    init();
  }, [router]);

  const loadStats = async () => {
    // Total swaps
    const { count: swapsCount } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("type", "swap");

    // Get all swap transactions to estimate profit (1% spread)
    const { data: swapTxs } = await supabase
      .from("transactions")
      .select("amount, currency")
      .eq("type", "swap")
      .gt("amount", 0); // only the positive side

    let estimatedProfit = 0;
    if (swapTxs) {
      // Rough estimation: 1% of the received amount
      swapTxs.forEach((tx) => {
        estimatedProfit += Number(tx.amount) * 0.01;
      });
    }

    // P2P stats
    const { count: p2pTotal } = await supabase
      .from("p2p_orders")
      .select("*", { count: "exact", head: true });

    const { count: p2pCompleted } = await supabase
      .from("p2p_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    setStats({
      totalSwaps: swapsCount || 0,
      estimatedSwapProfit: estimatedProfit,
      totalP2POrders: p2pTotal || 0,
      completedP2P: p2pCompleted || 0,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading profits...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Profits & Fees</h1>
            <p className="text-sm text-gray-500">Platform earnings overview</p>
          </div>
          <Link href="/admin" className="text-blue-600 text-sm hover:underline">
            ← Back to Admin
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-500">Total Swaps</p>
            <p className="text-3xl font-bold mt-1">{stats.totalSwaps}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-500">Estimated Swap Profit (1% spread)</p>
            <p className="text-3xl font-bold mt-1 text-green-600">
              ≈ {stats.estimatedSwapProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 mt-1">Rough estimate across all currencies</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-500">Total P2P Orders</p>
            <p className="text-3xl font-bold mt-1">{stats.totalP2POrders}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-500">Completed P2P Orders</p>
            <p className="text-3xl font-bold mt-1">{stats.completedP2P}</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
          <h3 className="font-semibold mb-2">How the platform currently earns:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Instant Swap:</strong> 1% spread on every swap (already working)</li>
            <li><strong>Spot Trading:</strong> No fee yet (we will add this next)</li>
            <li><strong>P2P:</strong> No fee yet (we can add later)</li>
            <li><strong>Withdrawals:</strong> No fee yet</li>
          </ul>
        </div>
      </main>
    </div>
  );
}