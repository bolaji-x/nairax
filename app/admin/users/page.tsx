"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Header from "@/app/components/Header";
import Link from "next/link";

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error) {
        setUsers(data || []);
      }

      setLoading(false);
    };

    init();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="text-sm text-gray-500">All registered users</p>
          </div>
          <Link href="/admin" className="text-blue-600 text-sm hover:underline">
            ← Back to Admin
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {users.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Username</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Country</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">KYC Level</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Mode</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">
                        {u.full_name || "—"}
                      </td>
                      <td className="px-6 py-4">{u.username || "—"}</td>
                      <td className="px-6 py-4">{u.country || "—"}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
                          Level {u.kyc_level || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            u.is_paper_mode
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {u.is_paper_mode ? "Paper" : "Real"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(u.created_at).toLocaleDateString()}
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