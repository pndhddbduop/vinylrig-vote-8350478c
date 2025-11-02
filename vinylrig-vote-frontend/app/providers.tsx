"use client";

import { ReactNode, useEffect } from "react";
import { WalletProvider } from "@/hooks/useWallet";
import { initTheme } from "@/lib/design-tokens";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialize theme on mount
    initTheme();
  }, []);

  return (
    <WalletProvider>
      {children}
    </WalletProvider>
  );
}

