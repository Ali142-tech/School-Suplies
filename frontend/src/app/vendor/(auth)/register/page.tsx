import type { Metadata } from 'next';
import { VendorSignup } from '@/components/vendor/auth';

export const metadata: Metadata = { title: 'Create a vendor account — Papertrail' };
export default function VendorRegisterPage() { return <VendorSignup />; }
