export async function getLivePrices() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd,ngn",
      { next: { revalidate: 60 } } // cache for 60 seconds
    );

    if (!res.ok) throw new Error("Failed to fetch prices");

    const data = await res.json();

    return {
      BTC: {
        usd: data.bitcoin?.usd || 0,
        ngn: data.bitcoin?.ngn || 0,
      },
      ETH: {
        usd: data.ethereum?.usd || 0,
        ngn: data.ethereum?.ngn || 0,
      },
      USDT: {
        usd: data.tether?.usd || 1,
        ngn: data.tether?.ngn || 1600,
      },
    };
  } catch (error) {
    console.error("Price fetch error:", error);
    return null;
  }
}