"use client";

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { User } from 'next-auth';
import { Toaster } from 'sonner';
import { LayoutDashboard, Wallet, Layers, PieChart, FileText, LogOut, LogIn } from 'lucide-react';

interface SidebarProps {
  user?: User | null;
}

export default function Sidebar({ user: initialUser }: SidebarProps) {
  const { data: session, status } = useSession();
  const user = initialUser || session?.user;

  return (
    <aside className="h-screen w-20 md:w-64 bg-gray-900 text-white transition-all duration-300 hover:shadow-xl group">
      <div className="flex flex-col h-full p-4">
        {/* Logo */}
        <Link href="/dashboard" className="mb-8 flex items-center space-x-2 p-2 hover:bg-gray-800 rounded-lg">
          <div className="bg-indigo-500 p-2 rounded-lg">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <span className="hidden md:inline text-xl font-bold">MoneyTracker</span>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {status === "authenticated" && user && (
            <>
              <NavItem href="/dashboard" icon={<LayoutDashboard />} text="Dashboard" />
              <NavItem href="/transactions" icon={<Wallet />} text="Transaksi" />
              <NavItem href="/categories" icon={<Layers />} text="Kategori" />
              <NavItem href="/budgets" icon={<PieChart />} text="Anggaran" />
              <NavItem href="/reports" icon={<FileText />} text="Laporan" />
            </>
          )}
        </nav>

        {/* User & Auth */}
        <div className="mt-auto space-y-4">
          {status === "authenticated" && user && (
            <>
              <div className="hidden md:flex items-center space-x-2 p-2 text-sm text-gray-300">
                <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center">
                  {user.name?.charAt(0) || user.email?.charAt(0)}
                </div>
                <span>{user.name || user.email}</span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center space-x-2 p-2 text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </>
          )}
          {status === "unauthenticated" && (
            <Link href="/login" className="flex items-center space-x-2 p-2 text-blue-400 hover:bg-gray-800 rounded-lg transition-colors">
              <LogIn className="h-5 w-5" />
              <span className="hidden md:inline">Login</span>
            </Link>
          )}
        </div>
      </div>
      <Toaster position="top-right" />
    </aside>
  );
}

const NavItem = ({ href, icon, text }: { href: string; icon: React.ReactNode; text: string }) => (
  <Link href={href} className="flex items-center space-x-2 p-2 hover:bg-gray-800 rounded-lg transition-colors">
    <div className="text-gray-400 group-hover:text-indigo-400 transition-colors">
      {icon}
    </div>
    <span className="hidden md:inline text-gray-300 group-hover:text-white transition-colors">
      {text}
    </span>
  </Link>
);