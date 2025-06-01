import Image from "next/image";
import Link from "next/link";
import { PieChart, Tags, Wallet } from 'lucide-react';

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen bg-white p-8 pb-20 gap-16 sm:p-20 text-gray-800">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-3xl">
        <div className="flex flex-col items-center sm:items-start gap-4 w-full">
          <Image
            src="/next.svg" // Ganti dengan logo terang jika tersedia
            alt="Money Tracker Logo"
            width={180}
            height={38}
            priority
            className="" // Hapus dark:invert
          />
          <h1 className="text-3xl sm:text-4xl font-bold text-center sm:text-left">
            Kelola Keuangan dengan <span className="text-blue-600">Mudah</span>
          </h1>
          <p className="text-gray-700 text-center sm:text-left max-w-xl">
            Aplikasi pencatat keuangan sederhana untuk mengontrol pemasukan dan pengeluaran Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <FeatureCard
            icon={<Wallet className="w-5 h-5 text-blue-500" />}
            title="Catat Transaksi"
            description="Tambahkan pemasukan dan pengeluaran dengan cepat"
          />
          <FeatureCard
            icon={<PieChart className="w-5 h-5 text-green-500" />}
            title="Analisis Keuangan"
            description="Lihat grafik pengeluaran bulanan Anda"
          />
          <FeatureCard
            icon={<Tags className="w-5 h-5 text-purple-500" />}
            title="Kelola Kategori"
            description="Atur kategori pengeluaran sesuai kebutuhan"
          />
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row w-full mt-4">
          <Link
            href="/dashboard"
            className="rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base h-12 px-6 flex items-center justify-center w-full sm:w-auto"
          >
            Mulai Sekarang →
          </Link>
          <Link
            href="/about"
            className="rounded-full border border-gray-300 bg-white hover:bg-gray-100 transition-colors font-medium text-sm sm:text-base h-12 px-6 flex items-center justify-center w-full sm:w-auto"
          >
            Pelajari Lebih Lanjut
          </Link>
        </div>
      </main>

      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-sm text-gray-500">
        <Link href="/privacy" className="hover:underline hover:text-gray-700">
          Kebijakan Privasi
        </Link>
        <Link href="/terms" className="hover:underline hover:text-gray-700">
          Syarat & Ketentuan
        </Link>
        <Link href="/contact" className="hover:underline hover:text-gray-700">
          Kontak Kami
        </Link>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white hover:border-blue-200 hover:shadow-sm transition-all">
      <div className="flex items-center gap-3 mb-3">
        {icon || <PieChart className="w-5 h-5 text-blue-500" />}
        <h3 className="font-medium text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}
