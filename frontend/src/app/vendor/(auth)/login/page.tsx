import type { Metadata } from 'next';
import { VendorLogin } from '@/components/vendor/auth';

export const metadata: Metadata = { title: 'Vendor sign in — Papertrail' };
export default function VendorLoginPage() { return <VendorLogin />; }
