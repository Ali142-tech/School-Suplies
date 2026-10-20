import { redirect } from 'next/navigation';
import { storeRef, storeRoot } from '@/lib/site';

// On a path-addressed store (/vendor/{slug}/school) the visitor must stay inside that store's prefix.
export default async function SchoolIndex() { redirect(`${storeRoot(await storeRef())}/school/dashboard`); }
