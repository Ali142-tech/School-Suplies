import type { Metadata } from 'next';
import { VendorForgotPassword } from '@/components/vendor/auth';

export const metadata: Metadata = { title: 'Reset your password — Papertrail' };
export default function VendorForgotPasswordPage() { return <VendorForgotPassword />; }
