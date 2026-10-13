import type { Metadata } from 'next';
import './globals.css';
import { StoreProvider } from '@/components/store';
export const metadata:Metadata={title:'Papertrail Supply Co. — Good things for great ideas',description:'A considered marketplace for school supplies, stationery and quality printing.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><StoreProvider>{children}</StoreProvider></body></html>}
