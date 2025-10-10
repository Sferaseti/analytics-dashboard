import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { Sidebar } from '@/components/admin/sidebar';
import { Header } from '@/components/admin/header';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  
  if (!user || user.role !== 'super_admin') {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow border-r bg-card pt-5 overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 md:pl-64">
        <Header user={user} />
        <main className="flex-1 p-6 bg-muted/50">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}