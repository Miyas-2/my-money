// src/app/layout.tsx
import "./globals.css";
import Providers from "@/components/Providers"; // Sesuaikan path jika berbeda
import { ReactNode } from "react";
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Money Tracker - Kelola Keuangan dengan Mudah',
  description: 'Aplikasi pencatat keuangan pribadi dengan analisis pengeluaran dan anggaran',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}