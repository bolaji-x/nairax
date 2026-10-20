# NairaX

**NairaX** is a full-stack cryptocurrency exchange platform focused on the African market (especially Nigeria). It supports Spot Trading, Instant Swap, and a Peer-to-Peer (P2P) marketplace.

## Features

- **Spot Trading**
  - Limit & Market orders
  - Live prices (CoinGecko)
  - TradingView candlestick charts
  - 0.1% trading fee

- **Instant Swap**
  - Crypto ↔ Crypto
  - Crypto ↔ Fiat (NGN, USD, GBP, GHS, KES, CAD)
  - Live market rates with spread

- **P2P Marketplace**
  - Post Buy/Sell ads
  - Escrow system
  - In-app chat
  - Order management

- **Wallet System**
  - Multi-currency wallets
  - Real Mode & Paper Mode (for practice)
  - Deposit & Withdraw

- **Admin Panel**
  - User management
  - P2P oversight
  - Profit tracking

## Tech Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (Auth + PostgreSQL)
- **Charts:** TradingView Widget
- **Prices:** CoinGecko API

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account

### Installation

```bash
git clone https://github.com/yourusername/nairax.git
cd nairax
npm install