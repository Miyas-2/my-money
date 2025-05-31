// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "../../../lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req): Promise<NextAuthUser | null> {
        if (!credentials?.email || !credentials?.password) {
          // throw new Error("Email dan password diperlukan."); // Bisa juga dilempar error
          return null; // Atau return null agar flow default NextAuth menangani
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          // User tidak ditemukan atau tidak memiliki password (seharusnya tidak terjadi jika registrasi benar)
          // throw new Error("Email atau password salah.");
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          // throw new Error("Email atau password salah.");
          return null;
        }

        // Jika valid, kembalikan objek user yang akan disimpan di token/session
        // Pastikan objek ini sesuai dengan tipe User di next-auth.d.ts
        return {
          id: user.id.toString(), // Pastikan ID adalah string jika tipe di next-auth.d.ts string
          name: user.username, // NextAuth mengharapkan 'name'
          email: user.email,
          // Anda bisa menambahkan properti lain di sini jika diperlukan
        };
      },
    }),
  ],
  session: {
    strategy: "jwt", // Gunakan JWT untuk sesi
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // `user` hanya ada saat login pertama kali atau sign up
      if (user) {
        token.id = user.id; // Tambahkan ID user ke token
        // token.username = (user as any).username; // Jika Anda menambahkan username ke User type
      }
      return token;
    },
    async session({ session, token, user }) {
      // `token` adalah JWT dari callback jwt di atas
      // `user` adalah user dari database (hanya saat menggunakan session strategy "database")
      if (token && session.user) {
        session.user.id = token.id as string; // Tambahkan ID user ke objek session client-side
        // session.user.name = token.username as string; // Jika Anda ingin username juga di session
      }
      return session;
    },
  },
  pages: {
    signIn: '/login', // Redirect ke halaman login kustom Anda
    // error: '/auth/error', // Halaman untuk menampilkan error autentikasi (opsional)
    // newUser: '/register' // Jika Anda ingin NextAuth mengarahkan user baru ke halaman tertentu (opsional)
  },
  // adapter: PrismaAdapter(prisma), // Opsional: Jika Anda ingin menyimpan sesi di database
  secret: process.env.NEXTAUTH_SECRET, // Pastikan NEXTAUTH_SECRET ada di .env.local
  debug: process.env.NODE_ENV === "development", // Tampilkan log debug saat development
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };