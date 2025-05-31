// src/app/(auth)/login/page.tsx
"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react"; // Fungsi signIn dari NextAuth
import { useRouter, useSearchParams } from "next/navigation"; // Untuk redirect dan callbackUrl
import Link from "next/link"; // Untuk link ke halaman registrasi

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
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white shadow-md rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-700">
          Login Akun
        </h1>
        <form onSubmit={handleSubmit}>
          {error && <p className="mb-4 text-red-500 text-sm">{error}</p>}
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">
          Belum punya akun?{" "}
          <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  );
}