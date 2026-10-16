import type { Metadata } from 'next';
import { SchoolLogin, SchoolUnavailable } from '@/components/school/auth';
import { currentSite } from '@/lib/site';

export const metadata: Metadata = { title: 'School sign in' };
// School accounts are tied to one vendor, so this page only works on that vendor's own address.
export default async function SchoolLoginPage() {
  const site = await currentSite();
  return site ? <SchoolLogin storeName={site.name} /> : <SchoolUnavailable />;
}
