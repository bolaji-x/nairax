"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import Header from "@/app/components/Header";

export default function MyOrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
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

      // Get orders where user is buyer or seller
      const { data } = await supabase
        .from("p2p_orders")
        .select(`
          *,
          ad:ad_id (
            currency
          )
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .eq("is_paper", paperMode)
        .order("created_at", { ascending: false });

      setOrders(data || []);
      setLoading(false);
    };

    init();
  }, [router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "paid":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "disputed":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My P2P Orders</h1>
          <Link
            href="/p2p"
            className="text-blue-600 text-sm hover:underline"
          >
            ← Back to Marketplace
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">
            <p>You have no P2P orders yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Role</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Amount</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Fiat</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order) => {
                    const isBuyer = order.buyer_id === user?.id;
                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span
                            className={`font-medium ${
                              isBuyer ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {isBuyer ? "Buying" : "Selling"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {Number(order.amount).toLocaleString()}{" "}
                          {order.ad?.currency}
                        </td>
                        <td className="px-6 py-4">
                          {Number(order.fiat_amount).toLocaleString()} NGN
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/p2p/orders/${order.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}