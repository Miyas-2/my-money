// src/app/layout.tsx
import "./globals.css";
import Providers from "@/components/Providers"; // Sesuaikan path jika berbeda
import { ReactNode } from "react";

export const metadata = {
  title: 'Money Tracker App',
  description: 'Kelola keuanganmu dengan mudah',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Providers>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}