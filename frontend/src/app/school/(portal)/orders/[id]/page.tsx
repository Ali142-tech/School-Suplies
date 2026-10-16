import { SchoolOrderDetail } from '@/components/school/orders';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <SchoolOrderDetail id={(await params).id} />; }
