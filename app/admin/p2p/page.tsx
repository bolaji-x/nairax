"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Header from "@/app/components/Header";
import Link from "next/link";

export default function AdminP2PPage() {
  const router = useRouter();
  const [ads, setAds] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"ads" | "orders">("ads");

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

      await loadData();
      setLoading(false);
    };

    init();
  }, [router]);

  const loadData = async () => {
    // Load all ads
    const { data: adsData } = await supabase
      .from("p2p_ads")
      .select(`
        *,
        profiles:user_id (
          full_name,
          username
        )
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    setAds(adsData || []);

    // Load all orders
    const { data: ordersData } = await supabase
      .from("p2p_orders")
      .select(`
        *,
        ad:ad_id (
          currency
        )
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    setOrders(ordersData || []);
  };

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
        <p>Loading P2P data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">P2P Management</h1>
            <p className="text-sm text-gray-500">View and manage all P2P activity</p>
          </div>
          <Link href="/admin" className="text-blue-600 text-sm hover:underline">
            ← Back to Admin
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("ads")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === "ads"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border"
            }`}
          >
            Ads ({ads.length})
          </button>
          <button
            onClick={() => setTab("orders")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === "orders"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border"
            }`}
          >
            Orders ({orders.length})
          </button>
        </div>

        {/* Ads Table */}
        {tab === "ads" && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {ads.length === 0 ? (
              <div className="p-10 text-center text-gray-500">No ads found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">User</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Type</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Crypto</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Price</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Available</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ads.map((ad) => (
                      <tr key={ad.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          {ad.profiles?.full_name || ad.profiles?.username || "User"}
                        </td>
                        <td className="px-5 py-3">
                          <span className={ad.type === "sell" ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                            {ad.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3">{ad.currency}</td>
                        <td className="px-5 py-3">{Number(ad.price).toLocaleString()} NGN</td>
                        <td className="px-5 py-3">
                          {Number(ad.available_amount).toLocaleString()} {ad.currency}
                        </td>
                        <td className="px-5 py-3">
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
                        <td className="px-5 py-3">
                          <button
                            onClick={() => toggleAdStatus(ad.id, ad.is_active)}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            {ad.is_active ? "Disable" : "Enable"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Orders Table */}
        {tab === "orders" && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {orders.length === 0 ? (
              <div className="p-10 text-center text-gray-500">No orders found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Amount</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Fiat</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Date</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          {Number(order.amount).toLocaleString()} {order.ad?.currency}
                        </td>
                        <td className="px-5 py-3">
                          {Number(order.fiat_amount).toLocaleString()} NGN
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              order.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : order.status === "paid"
                                ? "bg-blue-100 text-blue-800"
                                : order.status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            href={`/p2p/orders/${order.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}