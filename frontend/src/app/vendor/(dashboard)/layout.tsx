import type { Metadata } from 'next';
import { VendorShell } from '@/components/vendor-shell';

export const metadata:Metadata={title:'Vendor dashboard — Papertrail',robots:{index:false,follow:false}};
export default function VendorDashboardLayout({children}:{children:React.ReactNode}){return <VendorShell>{children}</VendorShell>}
