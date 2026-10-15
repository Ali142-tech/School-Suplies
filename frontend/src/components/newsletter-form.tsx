'use client';

import { useToast } from './toast';

export function NewsletterForm() {
  const toast = useToast();
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    toast.success('Thanks for subscribing!');
    event.currentTarget.reset();
  }

  return (
    <form className="newsletter-inline" onSubmit={handleSubmit}>
      <input placeholder="Your email" type="email" aria-label="Email address" required />
      <button>Join</button>
    </form>
  );
}
