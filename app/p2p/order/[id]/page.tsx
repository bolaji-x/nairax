
       "use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Header from "@/app/components/Header";

export default function P2POrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      await loadOrder(user.id);
      await loadMessages();
      setLoading(false);
    };

    init();
  }, [orderId, router]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadOrder = async (userId: string) => {
    const { data, error } = await supabase
      .from("p2p_orders")
      .select(`
        *,
        ad:ad_id (
          currency,
          payment_methods,
          terms
        )
      `)
      .eq("id", orderId)
      .single();

    if (error || !data) {
      setMessage("Order not found");
      return;
    }

    if (data.buyer_id !== userId && data.seller_id !== userId) {
      setMessage("You are not authorized to view this order");
      return;
    }

    setOrder(data);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from("p2p_messages")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    setSending(true);

    const { error } = await supabase.from("p2p_messages").insert({
      order_id: orderId,
      sender_id: user.id,
      message: newMessage.trim(),
    });

    if (!error) {
      setNewMessage("");
      await loadMessages();
    }

    setSending(false);
  };

  const markAsPaid = async () => {
    if (!order || !user) return;
    setActionLoading(true);
    setMessage("");

    try {
      await supabase
        .from("p2p_orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      setMessage("Marked as paid. Waiting for seller to release crypto.");
      await loadOrder(user.id);
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }

    setActionLoading(false);
  };

  const releaseCrypto = async () => {
    if (!order || !user) return;
    setActionLoading(true);
    setMessage("");

    try {
      const currency = order.ad.currency;
      const amount = Number(order.amount);

      // Deduct from seller's locked balance
      const { data: sellerWallet } = await supabase
        .from("wallets")
        .select("available_balance, locked_balance")
        .eq("user_id", order.seller_id)
        .eq("currency", currency)
        .eq("is_paper", order.is_paper)
        .single();

      if (sellerWallet) {
        await supabase
          .from("wallets")
          .update({
            locked_balance: Math.max(0, Number(sellerWallet.locked_balance) - amount),
          })
          .eq("user_id", order.seller_id)
          .eq("currency", currency)
          .eq("is_paper", order.is_paper);
      }

      // Credit the buyer
      const { data: buyerWallet } = await supabase
        .from("wallets")
        .select("available_balance")
        .eq("user_id", order.buyer_id)
        .eq("currency", currency)
        .eq("is_paper", order.is_paper)
        .single();

      const buyerBalance = Number(buyerWallet?.available_balance || 0);

      await supabase
        .from("wallets")
        .update({
          available_balance: buyerBalance + amount,
        })
        .eq("user_id", order.buyer_id)
        .eq("currency", currency)
        .eq("is_paper", order.is_paper);

      // Update order status
      await supabase
        .from("p2p_orders")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      setMessage("Crypto released successfully! Order completed.");
      await loadOrder(user.id);
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }

    setActionLoading(false);
  };

  const cancelOrder = async () => {
    if (!order || !user) return;
    setActionLoading(true);
    setMessage("");

    try {
      const currency = order.ad.currency;
      const amount = Number(order.amount);

      // Return locked crypto to seller
      const { data: sellerWallet } = await supabase
        .from("wallets")
        .select("available_balance, locked_balance")
        .eq("user_id", order.seller_id)
        .eq("currency", currency)
        .eq("is_paper", order.is_paper)
        .single();

      if (sellerWallet) {
        await supabase
          .from("wallets")
          .update({
            available_balance: Number(sellerWallet.available_balance) + amount,
            locked_balance: Math.max(0, Number(sellerWallet.locked_balance) - amount),
          })
          .eq("user_id", order.seller_id)
          .eq("currency", currency)
          .eq("is_paper", order.is_paper);
      }

      // Return amount to the ad
      const { data: ad } = await supabase
        .from("p2p_ads")
        .select("available_amount")
        .eq("id", order.ad_id)
        .single();

      if (ad) {
        await supabase
          .from("p2p_ads")
          .update({
            available_amount: Number(ad.available_amount) + amount,
          })
          .eq("id", order.ad_id);
      }

      await supabase
        .from("p2p_orders")
        .update({ status: "cancelled" })
        .eq("id", order.id);

      setMessage("Order cancelled. Crypto returned to seller.");
      await loadOrder(user.id);
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }

    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{message || "Order not found"}</p>
      </div>
    );
  }

  const isBuyer = user?.id === order.buyer_id;
  const isSeller = user?.id === order.seller_id;

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">P2P Order</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left - Order Info + Actions */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500">Status</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    order.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : order.status === "paid"
                      ? "bg-blue-100 text-blue-800"
                      : order.status === "cancelled"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {order.status.toUpperCase()}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-semibold">
                    {Number(order.amount).toLocaleString()} {order.ad?.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fiat Amount</span>
                  <span className="font-semibold">
                    {Number(order.fiat_amount).toLocaleString()} NGN
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Price</span>
                  <span>{Number(order.price).toLocaleString()} NGN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment</span>
                  <span>{order.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Your Role</span>
                  <span className="font-medium">{isBuyer ? "Buyer" : "Seller"}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow p-6 space-y-3">
              {message && (
                <div
                  className={`text-sm p-3 rounded-lg ${
                    message.includes("Error")
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {message}
                </div>
              )}

              {isBuyer && order.status === "pending" && (
                <button
                  onClick={markAsPaid}
                  disabled={actionLoading}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "I Have Paid"}
                </button>
              )}

              {isSeller && order.status === "paid" && (
                <button
                  onClick={releaseCrypto}
                  disabled={actionLoading}
                  className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading ? "Releasing..." : "Release Crypto"}
                </button>
              )}

              {order.status === "pending" && (
                <button
                  onClick={cancelOrder}
                  disabled={actionLoading}
                  className="w-full bg-gray-200 text-gray-800 py-2.5 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel Order
                </button>
              )}

              {order.status === "completed" && (
                <div className="text-center text-green-600 font-medium py-2">
                  Order Completed
                </div>
              )}
            </div>
          </div>

          {/* Right - Chat */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow flex flex-col" style={{ height: "500px" }}>
            <div className="border-b px-4 py-3 font-semibold">
              Chat
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-sm text-gray-400 text-center mt-10">
                  No messages yet. Start the conversation.
                </p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                          isMe
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-gray-100 text-gray-800 rounded-bl-none"
                        }`}
                      >
                        <p>{msg.message}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? "text-blue-100" : "text-gray-400"}`}>
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {order.status !== "completed" && order.status !== "cancelled" && (
              <form onSubmit={sendMessage} className="border-t p-3 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}