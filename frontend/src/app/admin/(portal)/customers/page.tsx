import { redirect } from 'next/navigation';
// Legacy address: the customer list became "Users & schools".
export default function Page() { redirect('/admin/users'); }
