'use client';

export function NewsletterForm() {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.alert('Thanks for subscribing!');
    event.currentTarget.reset();
  }

  return (
    <form
      style={{ display: 'flex', border: '1px solid #dce2ea', background: '#fff', padding: 4, borderRadius: 5 }}
      onSubmit={handleSubmit}
    >
      <input placeholder="Your email" type="email" aria-label="Email address" required style={{ border: 0, padding: 8, width: 125, fontSize: 10 }} />
      <button style={{ border: 0, background: '#2f62d3', color: '#fff', borderRadius: 4, padding: '0 10px' }}>Join</button>
    </form>
  );
}
