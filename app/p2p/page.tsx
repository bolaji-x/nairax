"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import Header from "@/app/components/Header";

type P2PAd = {
  id: string;
  user_id: string;
  type: string;
  currency: string;
  fiat_currency: string;
  price: number;
  total_amount: number;
  available_amount: number;
  min_limit: number;
  max_limit: number;
  payment_methods: string[];
  terms: string;
  is_active: boolean;
  created_at: string;
  profiles?: {
    full_name: string;
    username: string;
  };
};

export default function P2PPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [ads, setAds] = useState<P2PAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaperMode, setIsPaperMode] = useState(false);
  const [filterType, setFilterType] = useState<"buy" | "sell">("buy");
  const [filterCurrency, setFilterCurrency] = useState("USDT");

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

  useEffect(() => {
    if (!user) return;
    loadAds();
  }, [user, filterType, filterCurrency, isPaperMode]);

  const loadAds = async () => {
    const { data, error } = await supabase
      .from("p2p_ads")
      .select(`
        *,
        profiles:user_id (
          full_name,
          username
        )
      `)
      .eq("type", filterType)
      .eq("currency", filterCurrency)
      .eq("is_active", true)
      .eq("is_paper", isPaperMode)
      .gt("available_amount", 0)
      .order("price", { ascending: filterType === "buy" ? false : true });

    if (!error) {
      setAds(data || []);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading P2P...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">P2P Marketplace</h1>
            <p className="text-sm text-gray-500 mt-1">
              Buy & Sell crypto directly with other users
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium ${
                isPaperMode
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {isPaperMode ? "Paper Mode" : "Real Mode"}
            </span>

            <Link
              href="/p2p/create"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              + Post Ad
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Buy / Sell */}
            <div className="flex rounded-lg overflow-hidden border">
              <button
                onClick={() => setFilterType("buy")}
                className={`px-5 py-2 text-sm font-medium ${
                  filterType === "buy"
                    ? "bg-green-600 text-white"
                    : "bg-gray-50 text-gray-600"
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setFilterType("sell")}
                className={`px-5 py-2 text-sm font-medium ${
                  filterType === "sell"
                    ? "bg-red-600 text-white"
                    : "bg-gray-50 text-gray-600"
                }`}
              >
                Sell
              </button>
            </div>

            {/* Currency */}
            <select
              value={filterCurrency}
              onChange={(e) => setFilterCurrency(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm"
            >
              <option value="USDT">USDT</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
            </select>
          </div>
        </div>

        {/* Ads List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {ads.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-lg">No ads available</p>
              <p className="text-sm mt-2">Be the first to post an ad</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Advertiser</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Price</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Available</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Limit</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Payment</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ads.map((ad) => (
                    <tr key={ad.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium">
                          {ad.profiles?.full_name || ad.profiles?.username || "User"}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {Number(ad.price).toLocaleString()} {ad.fiat_currency}
                      </td>
                      <td className="px-6 py-4">
                        {Number(ad.available_amount).toLocaleString()} {ad.currency}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {Number(ad.min_limit).toLocaleString()} - {Number(ad.max_limit).toLocaleString()} {ad.fiat_currency}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {ad.payment_methods?.map((method) => (
                            <span
                              key={method}
                              className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded"
                            >
                              {method}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/p2p/order/${ad.id}`}
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium text-white ${
                            filterType === "buy"
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-red-600 hover:bg-red-700"
                          }`}
                        >
                          {filterType === "buy" ? "Buy" : "Sell"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}