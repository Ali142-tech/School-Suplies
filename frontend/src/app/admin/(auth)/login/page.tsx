import type { Metadata } from 'next';
import { AdminLogin } from '@/components/admin/login';

export const metadata: Metadata = { title: 'Administrator sign in' };
export default function AdminLoginPage() { return <AdminLogin />; }
