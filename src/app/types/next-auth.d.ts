// src/types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string; // atau tipe ID Anda, misalnya number jika dari Prisma INT
    } & DefaultSession["user"]; // Mempertahankan properti default lainnya
    error?: string; // Untuk menangani error custom saat login
  }

  interface User extends DefaultUser {
    id: string; // atau tipe ID Anda
    // Tambahkan properti lain dari model User Prisma Anda jika perlu diakses di session/token
    // username?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string; // atau tipe ID Anda
    // username?: string | null;
  }
}