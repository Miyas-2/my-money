import { ReactNode } from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar'; // atau Sidebar
import Providers from '@/components/Providers'; // pastikan path-nya benar

interface AppLayoutProps {
  children: ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <Providers>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <Sidebar user={session.user} />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
          
          {/* Footer */}
          <footer className="bg-white border-t p-4 text-center text-sm text-gray-600">
            © {new Date().getFullYear()} MoneyTracker
          </footer>
        </div>
      </div>
    </Providers>
  );
}
