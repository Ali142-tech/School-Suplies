import type { Metadata } from 'next';
import { SchoolRegister, SchoolUnavailable } from '@/components/school/auth';
import { currentSite } from '@/lib/site';

export const metadata: Metadata = { title: 'Register your school' };
export default async function SchoolRegisterPage() {
  const site = await currentSite();
  return site ? <SchoolRegister storeName={site.name} /> : <SchoolUnavailable />;
}
