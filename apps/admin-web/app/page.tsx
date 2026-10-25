import { redirect } from 'next/navigation';
import { currentAdmin, getSession } from '@/lib/server';
import Dashboard from '@/components/dashboard';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const token = await getSession();
  if (!token) redirect('/login');
  const user = await currentAdmin(token);
  if (!user) redirect('/login?session=expired');
  return <Dashboard user={{ displayName: user.displayName || 'Administrator', role: user.role }} />;
}
