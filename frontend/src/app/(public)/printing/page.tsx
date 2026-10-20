import Link from '@/components/store-link';
import { ArrowRight } from 'lucide-react';
import { PrintingProducts } from '@/components/printing-products';
import { QuoteForm } from '@/components/quote-form';

export default function Printing() {
 return <><section className="printing-hero"><div><span className="eyebrow">Print with purpose</span><h1>Good ideas deserve a great print.</h1><p>From the first sketch to the final finish, get thoughtful printing for your business, school or next big project.</p><Link className="button-primary" href="#quote">Request a custom quote <ArrowRight size={15}/></Link></div><div className="printing-photo"/></section><section className="section"><div className="section-heading"><div><span className="eyebrow">Made for making an impression</span><h2>Explore print products</h2></div></div><PrintingProducts/></section><section className="section section-soft" id="quote"><div className="section-heading"><div><span className="eyebrow">Have something specific in mind?</span><h2>Let’s make it together.</h2></div></div><QuoteForm/></section></>;
}
