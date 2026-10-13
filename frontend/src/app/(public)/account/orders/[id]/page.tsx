'use client';
import { useParams } from 'next/navigation';
import { CustomerOrderDetail } from '@/components/customer-sections';
export default function CustomerOrderPage(){const{id}=useParams<{id:string}>();return <CustomerOrderDetail id={id}/>;}
