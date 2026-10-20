"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Header from "@/app/components/Header";
import { getLivePrices } from "@/app/lib/prices";

type TradingPair = {
  id: string;
  symbol: string;
  base_currency: string;
  quote_currency: string;
};

type Order = {
  id: string;
  side: string;
  price: number;
  quantity: number;
  filled_quantity: number;
  status: string;
  user_id: string;
  created_at: string;
};

type Trade = {
  id: string;
  price: number;
  quantity: number;
  created_at: string;
};

declare global {
  interface Window {
    TradingView: any;
  }
}

export default function TradePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [pairs, setPairs] = useState<TradingPair[]>([]);
  const [selectedPair, setSelectedPair] = useState<TradingPair | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [orderBook, setOrderBook] = useState<{ buy: Order[]; sell: Order[] }>({ buy: [], sell: [] });
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaperMode, setIsPaperMode] = useState(false);

  const [baseBalance, setBaseBalance] = useState(0);
  const [quoteBalance, setQuoteBalance] = useState(0);
  const [lastPrice, setLastPrice] = useState(0);
  const [livePrice, setLivePrice] = useState(0);

  const [orderType, setOrderType] = useState<"limit" | "market">("limit");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const TRADING_FEE = 0.001; // 0.1%

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
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

      const { data: pairsData } = await supabase
        .from("trading_pairs")
        .select("*")
        .eq("is_active", true)
        .order("symbol");

      setPairs(pairsData || []);
      if (pairsData?.length) setSelectedPair(pairsData[0]);
      setLoading(false);
    };
    init();
  }, [router]);

  // Load TradingView
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (selectedPair) createChart(selectedPair);
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (selectedPair && window.TradingView) {
      createChart(selectedPair);
    }
  }, [selectedPair]);

  const createChart = (pair: TradingPair) => {
    if (!chartContainerRef.current || !window.TradingView) return;
    chartContainerRef.current.innerHTML = "";

    const symbolMap: Record<string, string> = {
      BTCUSDT: "BINANCE:BTCUSDT",
      ETHUSDT: "BINANCE:ETHUSDT",
      BTCNGN: "BINANCE:BTCUSDT",
      ETHNGN: "BINANCE:ETHUSDT",
      USDTNGN: "BINANCE:BTCUSDT",
    };

    new window.TradingView.widget({
      container_id: chartContainerRef.current.id,
      symbol: symbolMap[pair.symbol] || "BINANCE:BTCUSDT",
      interval: "15",
      timezone: "Africa/Lagos",
      theme: "light",
      style: "1",
      locale: "en",
      toolbar_bg: "#f1f3f6",
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      details: true,
      studies: ["RSI@tv-basicstudies", "MASimple@tv-basicstudies"],
      width: "100%",
      height: 420,
    });
  };

  useEffect(() => {
    if (!user || !selectedPair) return;
    loadAllData();
  }, [user, selectedPair, isPaperMode]);

  useEffect(() => {
    const fetchPrice = async () => {
      if (!selectedPair) return;
      const prices = await getLivePrices();
      if (!prices) return;

      const base = selectedPair.base_currency;
      const quote = selectedPair.quote_currency;

      if (base === "BTC" && quote === "USDT") setLivePrice(prices.BTC.usd);
      else if (base === "ETH" && quote === "USDT") setLivePrice(prices.ETH.usd);
      else if (base === "BTC" && quote === "NGN") setLivePrice(prices.BTC.ngn);
      else if (base === "ETH" && quote === "NGN") setLivePrice(prices.ETH.ngn);
      else if (base === "USDT" && quote === "NGN") setLivePrice(prices.USDT.ngn);
      else setLivePrice(0);
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, [selectedPair]);

  const loadAllData = async () => {
    if (!user || !selectedPair) return;

    const { data: wallets } = await supabase
      .from("wallets")
      .select("currency, available_balance")
      .eq("user_id", user.id)
      .eq("is_paper", isPaperMode)
      .in("currency", [selectedPair.base_currency, selectedPair.quote_currency]);

    setBaseBalance(Number(wallets?.find(w => w.currency === selectedPair.base_currency)?.available_balance || 0));
    setQuoteBalance(Number(wallets?.find(w => w.currency === selectedPair.quote_currency)?.available_balance || 0));

    const { data: myOrdersData } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("pair_id", selectedPair.id)
      .eq("is_paper", isPaperMode)
      .in("status", ["open", "partially_filled"])
      .order("created_at", { ascending: false });
    setMyOrders(myOrdersData || []);

    const { data: allOrders } = await supabase
      .from("orders")
      .select("*")
      .eq("pair_id", selectedPair.id)
      .eq("is_paper", isPaperMode)
      .in("status", ["open", "partially_filled"]);

    setOrderBook({
      buy: (allOrders || []).filter(o => o.side === "buy").sort((a, b) => Number(b.price) - Number(a.price)),
      sell: (allOrders || []).filter(o => o.side === "sell").sort((a, b) => Number(a.price) - Number(b.price)),
    });

    const { data: tradesData } = await supabase
      .from("trades")
      .select("*")
      .eq("pair_id", selectedPair.id)
      .eq("is_paper", isPaperMode)
      .order("created_at", { ascending: false })
      .limit(15);

    setRecentTrades(tradesData || []);
    if (tradesData?.length) setLastPrice(Number(tradesData[0].price));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPair) return;

    let orderPrice = parseFloat(price);
    const orderQty = parseFloat(quantity);

    if (orderType === "market") {
      orderPrice = side === "buy"
        ? (orderBook.sell[0] ? Number(orderBook.sell[0].price) : 0)
        : (orderBook.buy[0] ? Number(orderBook.buy[0].price) : 0);
      if (orderPrice <= 0) {
        setMessage("No liquidity for market order");
        return;
      }
    }

    if (isNaN(orderPrice) || orderPrice <= 0 || isNaN(orderQty) || orderQty <= 0) {
      setMessage("Please enter valid values");
      return;
    }

    const total = orderPrice * orderQty;
    const fee = total * TRADING_FEE;
    const totalWithFee = total + fee;

    if (side === "buy" && totalWithFee > quoteBalance) {
      setMessage(`Insufficient ${selectedPair.quote_currency} (including 0.1% fee)`);
      return;
    }
    if (side === "sell" && orderQty > baseBalance) {
      setMessage(`Insufficient ${selectedPair.base_currency}`);
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const { error } = await supabase.from("orders").insert({
        user_id: user.id,
        pair_id: selectedPair.id,
        side,
        type: orderType,
        price: orderPrice,
        quantity: orderQty,
        filled_quantity: 0,
        status: "open",
        is_paper: isPaperMode,
      });

      if (error) throw error;

      // Deduct balance + fee
      if (side === "buy") {
        await supabase.from("wallets").update({
          available_balance: quoteBalance - totalWithFee,
        }).eq("user_id", user.id).eq("currency", selectedPair.quote_currency).eq("is_paper", isPaperMode);
      } else {
        // For sell: lock the quantity, fee will be taken from quote when matched (simplified)
        await supabase.from("wallets").update({
          available_balance: baseBalance - orderQty,
        }).eq("user_id", user.id).eq("currency", selectedPair.base_currency).eq("is_paper", isPaperMode);
      }

      // Record the fee as a transaction (platform income)
      if (fee > 0) {
        await supabase.from("transactions").insert({
          user_id: user.id,
          type: "trading_fee",
          currency: selectedPair.quote_currency,
          amount: fee,
          status: "completed",
          is_paper: isPaperMode,
        });
      }

      setMessage(`${side.toUpperCase()} order placed! (Fee: ${fee.toFixed(4)} ${selectedPair.quote_currency})`);
      setPrice("");
      setQuantity("");
      await loadAllData();
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }
    setSubmitting(false);
  };

  const cancelOrder = async (orderId: string) => {
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    await loadAllData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading trading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-3 py-4">
        {/* Top Bar */}
        <div className="bg-white rounded-xl border shadow-sm p-4 mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <select
              value={selectedPair?.id || ""}
              onChange={(e) => {
                const pair = pairs.find(p => p.id === e.target.value);
                setSelectedPair(pair || null);
              }}
              className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 font-bold text-sm"
            >
              {pairs.map(pair => (
                <option key={pair.id} value={pair.id}>{pair.symbol}</option>
              ))}
            </select>

            <div>
              <div className="text-2xl font-bold">
                {livePrice > 0 ? livePrice.toLocaleString() : lastPrice > 0 ? lastPrice.toLocaleString() : "—"}
              </div>
              <div className="text-xs text-gray-500">
                {livePrice > 0 ? "Live Price" : "Last Price"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div>
              <div className="text-gray-500 text-xs">Available</div>
              <div className="font-medium">{baseBalance.toLocaleString()} {selectedPair?.base_currency}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Available</div>
              <div className="font-medium">{quoteBalance.toLocaleString()} {selectedPair?.quote_currency}</div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isPaperMode ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
              {isPaperMode ? "Paper" : "Real"}
            </span>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl border shadow-sm p-2 mb-4">
          <div id="tradingview_chart" ref={chartContainerRef} style={{ height: "420px" }} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Order Form */}
          <div className="lg:col-span-3 bg-white rounded-xl border shadow-sm p-4">
            <div className="flex mb-4 rounded-lg overflow-hidden border">
              <button onClick={() => setSide("buy")} className={`flex-1 py-2.5 text-sm font-semibold ${side === "buy" ? "bg-green-600 text-white" : "bg-gray-50 text-gray-600"}`}>
                Buy
              </button>
              <button onClick={() => setSide("sell")} className={`flex-1 py-2.5 text-sm font-semibold ${side === "sell" ? "bg-red-600 text-white" : "bg-gray-50 text-gray-600"}`}>
                Sell
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={() => setOrderType("limit")} className={`flex-1 py-1.5 text-xs rounded-lg border ${orderType === "limit" ? "bg-blue-50 border-blue-500 text-blue-700 font-medium" : "bg-gray-50"}`}>
                Limit
              </button>
              <button onClick={() => setOrderType("market")} className={`flex-1 py-1.5 text-xs rounded-lg border ${orderType === "market" ? "bg-blue-50 border-blue-500 text-blue-700 font-medium" : "bg-gray-50"}`}>
                Market
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-3">
              {orderType === "limit" && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Price</label>
                  <input type="number" step="any" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00" required />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount</label>
                <input type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00" required />
              </div>

              {orderType === "limit" && price && quantity && (
                <div className="text-xs bg-gray-50 p-2 rounded space-y-1">
                  <div>Total: <strong>{(parseFloat(price) * parseFloat(quantity)).toLocaleString()} {selectedPair?.quote_currency}</strong></div>
                  <div>Fee (0.1%): <strong>{(parseFloat(price) * parseFloat(quantity) * TRADING_FEE).toFixed(4)} {selectedPair?.quote_currency}</strong></div>
                </div>
              )}

              {message && (
                <div className={`text-xs p-2 rounded ${message.includes("Error") || message.includes("Insufficient") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                  {message}
                </div>
              )}

              <button type="submit" disabled={submitting} className={`w-full py-2.5 rounded-lg text-white text-sm font-semibold ${side === "buy" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
                {submitting ? "Processing..." : `${side === "buy" ? "Buy" : "Sell"} ${selectedPair?.base_currency}`}
              </button>
            </form>
          </div>

          {/* Order Book + Recent Trades */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <h3 className="text-sm font-semibold mb-3">Order Book</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="flex justify-between text-gray-400 mb-1 px-1"><span>Price</span><span>Size</span></div>
                  <div className="space-y-0.5 max-h-48 overflow-y-auto">
                    {orderBook.sell.slice(0, 10).map(order => (
                      <div key={order.id} className="flex justify-between py-0.5 px-1 hover:bg-red-50">
                        <span className="text-red-600">{Number(order.price).toLocaleString()}</span>
                        <span>{(Number(order.quantity) - Number(order.filled_quantity)).toFixed(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-gray-400 mb-1 px-1"><span>Price</span><span>Size</span></div>
                  <div className="space-y-0.5 max-h-48 overflow-y-auto">
                    {orderBook.buy.slice(0, 10).map(order => (
                      <div key={order.id} className="flex justify-between py-0.5 px-1 hover:bg-green-50">
                        <span className="text-green-600">{Number(order.price).toLocaleString()}</span>
                        <span>{(Number(order.quantity) - Number(order.filled_quantity)).toFixed(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-4">
              <h3 className="text-sm font-semibold mb-3">Recent Trades</h3>
              <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
                {recentTrades.map(trade => (
                  <div key={trade.id} className="flex justify-between py-0.5 px-1">
                    <span className="font-medium">{Number(trade.price).toLocaleString()}</span>
                    <span>{Number(trade.quantity).toFixed(5)}</span>
                    <span className="text-gray-500">{new Date(trade.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* My Orders */}
          <div className="lg:col-span-4 bg-white rounded-xl border shadow-sm p-4">
            <h3 className="text-sm font-semibold mb-3">My Open Orders</h3>
            {myOrders.length === 0 ? (
              <p className="text-sm text-gray-400">No open orders</p>
            ) : (
              <div className="space-y-2 text-xs">
                {myOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <span className={`font-semibold ${order.side === "buy" ? "text-green-600" : "text-red-600"}`}>
                        {order.side.toUpperCase()}
                      </span>
                      <span className="ml-2">{Number(order.price).toLocaleString()}</span>
                      <div className="text-gray-500">{Number(order.quantity)} {selectedPair?.base_currency}</div>
                    </div>
                    <button onClick={() => cancelOrder(order.id)} className="text-red-500 hover:underline">Cancel</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}