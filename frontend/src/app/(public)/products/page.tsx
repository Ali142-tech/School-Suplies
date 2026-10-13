import Catalog from '@/components/catalog';

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const initialCategory = category ? category.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) : 'All products';
  return <Catalog initialCategory={initialCategory} />;
}
