"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Header from "@/app/components/Header";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
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

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setUsername(data.username || "");
        setCountry(data.country || "");
        setIsPaperMode(data.is_paper_mode ?? false);
      }

      setLoading(false);
    };

    init();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          username: username,
          country: country,
          is_paper_mode: isPaperMode,
        })
        .eq("id", user.id);

      if (error) throw error;

      setMessage("Profile updated successfully");
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }

    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account settings</p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
          <form onSubmit={handleSave} className="space-y-5">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-500"
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your full name"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Choose a username"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Nigeria"
              />
            </div>

            {/* Paper Mode Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900">Paper Mode</p>
                <p className="text-xs text-gray-500">
                  Practice trading with fake money
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaperMode(!isPaperMode)}
                className={`relative w-12 h-6 rounded-full transition ${
                  isPaperMode ? "bg-yellow-400" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition ${
                    isPaperMode ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>

            {message && (
              <div
                className={`text-sm p-3 rounded-xl ${
                  message.includes("Error")
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Account Info</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">KYC Level</span>
              <span className="font-medium">Level {profile?.kyc_level || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Member Since</span>
              <span className="font-medium">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-50 text-red-600 py-3.5 rounded-xl font-semibold hover:bg-red-100 transition"
        >
          Logout
        </button>
      </main>
    </div>
  );
}