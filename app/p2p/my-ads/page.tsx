"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import Header from "@/app/components/Header";

export default function MyAdsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [ads, setAds] = useState<any[]>([]);
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

      const { data } = await supabase
        .from("p2p_ads")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_paper", paperMode)
        .order("created_at", { ascending: false });

      setAds(data || []);
      setLoading(false);
    };

    init();
  }, [router]);

  const toggleAdStatus = async (adId: string, currentStatus: boolean) => {
    await supabase
      .from("p2p_ads")
      .update({ is_active: !currentStatus })
      .eq("id", adId);

    setAds((prev) =>
      prev.map((ad) =>
        ad.id === adId ? { ...ad, is_active: !currentStatus } : ad
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading your ads...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My P2P Ads</h1>
          <Link
            href="/p2p/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Post New Ad
          </Link>
        </div>

        {ads.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">
            <p>You have not posted any ads yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Crypto</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Price</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Available</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ads.map((ad) => (
                    <tr key={ad.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span
                          className={`font-medium ${
                            ad.type === "sell" ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {ad.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">{ad.currency}</td>
                      <td className="px-6 py-4">
                        {Number(ad.price).toLocaleString()} NGN
                      </td>
                      <td className="px-6 py-4">
                        {Number(ad.available_amount).toLocaleString()} {ad.currency}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            ad.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {ad.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleAdStatus(ad.id, ad.is_active)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {ad.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}