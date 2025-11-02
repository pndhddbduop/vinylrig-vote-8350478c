"use client";

import { useMemo } from "react";
import {
  GenericStringInMemoryStorage,
  GenericStringStorage,
} from "@/fhevm/GenericStringStorage";

// Singleton in-memory storage instance
let globalStorage: GenericStringStorage | null = null;

export const useInMemoryStorage = (): GenericStringStorage => {
  return useMemo(() => {
    if (!globalStorage) {
      globalStorage = new GenericStringInMemoryStorage();
    }
    return globalStorage;
  }, []);
};

