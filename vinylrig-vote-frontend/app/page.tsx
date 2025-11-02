"use client";

import Link from "next/link";
import { Headphones, Shield, TrophyIcon } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

export default function HomePage() {
  const { isConnected, connect } = useWallet();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation placeholder */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-heading font-bold text-primary">VinylRig Vote</h1>
            </div>
            <button
              onClick={connect}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              {isConnected ? "Connected" : "Connect Wallet"}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-heading font-bold mb-6">
            Anonymous Blind Listening Vote
          </h2>
          <p className="text-xl text-muted-foreground mb-4">
            For Vinyl Enthusiasts
          </p>
          <p className="text-lg text-muted-foreground mb-8">
            Powered by FHEVM - Your preferences stay encrypted, always.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/sessions"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Connect Wallet & Start
            </Link>
            <a
              href="https://docs.zama.ai/fhevm"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-border rounded-lg font-semibold hover:bg-muted transition-colors"
            >
              Learn More About Privacy
            </a>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <Headphones className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-2">Blind Listening</h3>
              <p className="text-muted-foreground">
                Participate in anonymous equipment listening tests
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-2">Private Voting</h3>
              <p className="text-muted-foreground">
                Your individual votes are encrypted end-to-end
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <TrophyIcon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-2">Transparent Rankings</h3>
              <p className="text-muted-foreground">
                See aggregated results without exposing personal preferences
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-heading font-bold text-center mb-12">How It Works</h3>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-1">Connect your Web3 wallet</h4>
                <p className="text-muted-foreground">
                  Use MetaMask or any EIP-6963 compatible wallet
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                2
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-1">Join an active listening session</h4>
                <p className="text-muted-foreground">
                  Browse available sessions or create your own
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-1">Submit encrypted votes with preference tags</h4>
                <p className="text-muted-foreground">
                  Rate equipment and tag frequency characteristics (Bass, Midrange, Treble, etc.)
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                4
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-1">View aggregated rankings after session closes</h4>
                <p className="text-muted-foreground">
                  See community results while your personal votes stay private
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 mt-16">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p className="mb-2">VinylRig Vote - Powered by FHEVM</p>
          <div className="flex gap-6 justify-center">
            <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="https://docs.zama.ai/fhevm" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">FHEVM Docs</a>
            <a href="#" className="hover:text-foreground transition-colors">License: MIT</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

