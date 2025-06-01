// src/components/Providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { Toaster } from 'sonner'; // 1. Impor Toaster

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      {children}
      {/* 2. Tambahkan Toaster di sini. Anda bisa mengatur posisi, tema, dll. */}
      <Toaster richColors position="top-right" />
    </SessionProvider>
  );
}