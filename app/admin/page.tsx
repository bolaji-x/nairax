"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Header from "@/app/components/Header";
import Link from "next/link";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalP2POrders: 0,
    totalSwaps: 0,
  });

  const ADMIN_EMAIL = "hd0921329@gmail.com";

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      console.log("Logged in as:", user.email);
      console.log("Admin email is:", ADMIN_EMAIL);

      // Check if user is admin
      if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        alert(`Access denied.\nYou are logged in as: ${user.email}\nAdmin email is: ${ADMIN_EMAIL}`);
        router.push("/dashboard");
        return;
      }

      setUser(user);
      await loadStats();
      setLoading(false);
    };

    init();
  }, [router]);

  const loadStats = async () => {
    const { count: usersCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: ordersCount } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true });

    const { count: p2pCount } = await supabase
      .from("p2p_orders")
      .select("*", { count: "exact", head: true });

    const { count: swapsCount } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("type", "swap");

    setStats({
      totalUsers: usersCount || 0,
      totalOrders: ordersCount || 0,
      totalP2POrders: p2pCount || 0,
      totalSwaps: swapsCount || 0,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-sm text-gray-500">Welcome, Admin ({user?.email})</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-3xl font-bold mt-1">{stats.totalUsers}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">Spot Orders</p>
            <p className="text-3xl font-bold mt-1">{stats.totalOrders}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">P2P Orders</p>
            <p className="text-3xl font-bold mt-1">{stats.totalP2POrders}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">Total Swaps</p>
            <p className="text-3xl font-bold mt-1">{stats.totalSwaps}</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link
            href="/admin/users"
            className="bg-white rounded-xl shadow p-6 hover:shadow-md transition"
          >
            <h3 className="font-semibold text-lg">Users</h3>
            <p className="text-sm text-gray-500 mt-1">View and manage all users</p>
          </Link>

          <Link
            href="/admin/p2p"
            className="bg-white rounded-xl shadow p-6 hover:shadow-md transition"
          >
            <h3 className="font-semibold text-lg">P2P Management</h3>
            <p className="text-sm text-gray-500 mt-1">View ads and orders</p>
          </Link>

          <Link
            href="/admin/profits"
            className="bg-white rounded-xl shadow p-6 hover:shadow-md transition"
          >
            <h3 className="font-semibold text-lg">Profits & Fees</h3>
            <p className="text-sm text-gray-500 mt-1">Track platform earnings</p>
          </Link>
        </div>
      </main>
    </div>
  );
}