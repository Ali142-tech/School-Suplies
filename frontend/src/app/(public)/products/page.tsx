import Catalog from '@/components/catalog';

export default function ProductsPage({ searchParams }: { searchParams: { category?: string } }) {
  const initialCategory = searchParams.category ? searchParams.category.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) : 'All products';
  return <Catalog initialCategory={initialCategory} />;
}
