// src/app/(auth)/login/page.tsx
"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react"; // Fungsi signIn dari NextAuth
import { useRouter, useSearchParams } from "next/navigation"; // Untuk redirect dan callbackUrl
import { motion } from 'framer-motion';
import { Lock, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"; // Redirect ke dashboard atau callbackUrl jika ada

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        redirect: false, // Kita tangani redirect manual agar bisa menampilkan error
        email: email,
        password: password,
      });

      if (result?.error) {
        // Tampilkan error dari NextAuth (misal: "CredentialsSignin")
        // Anda bisa memetakan pesan error ini ke pesan yang lebih user-friendly
        if (result.error === "CredentialsSignin") {
            setError("Email atau password salah. Silakan coba lagi.");
        } else {
            setError(result.error);
        }
      } else if (result?.ok) {
        // Login berhasil
        router.push(callbackUrl); // Redirect ke dashboard atau halaman sebelumnya
      } else {
        setError("Gagal melakukan login. Silakan coba lagi.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Terjadi kesalahan pada server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
 <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-gray-100"
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="p-8 bg-white rounded-xl shadow-lg w-full max-w-md mx-4 border border-gray-100"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-100 p-3 rounded-full">
            <Lock className="h-6 w-6 text-indigo-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mb-2 text-center text-gray-800">
          Masuk ke Akun Anda
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Silakan masuk untuk melanjutkan
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 text-red-600 rounded-lg text-sm"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Alamat Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block text-black w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 sm:text-sm"
                placeholder="email@contoh.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-black block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Memproses...
                </>
              ) : 'Masuk'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Belum punya akun?{' '}
            <Link 
              href="/register" 
              className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              Daftar sekarang
            </Link>
          </p>
          <Link 
            href="/forgot-password" 
            className="mt-2 inline-block text-xs text-indigo-500 hover:text-indigo-400 transition-colors"
          >
            Lupa password?
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}