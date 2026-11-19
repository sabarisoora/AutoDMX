import Image from 'next/image';
import Link from 'next/link';

export const dynamic = 'force-static';

const INSTAGRAM = 'https://www.instagram.com/billionaire_sabari';

const pillars = [
  { n: '01', title: 'Digital marketing', body: 'Real campaigns, real numbers, shared as they happen.' },
  { n: '02', title: 'AI & automation', body: 'Tools and systems that do the boring work for you.' },
  { n: '03', title: 'Building in public', body: 'Every win and every mistake on the road to a billion.' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f3f0e8] text-[#111] selection:bg-[#00d0f5] selection:text-[#111]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-8">
        {/* Top bar */}
        <header className="flex items-center justify-between py-6 text-[11px] uppercase tracking-[0.25em]">
          <span>Billionaire Sabari</span>
          <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
            Instagram ↗
          </a>
        </header>

        {/* Hero */}
        <main className="grid flex-1 items-center gap-12 py-10 md:grid-cols-[1.15fr_1fr] md:gap-16 md:py-16">
          <section>
            <p className="mb-6 text-[11px] uppercase tracking-[0.3em] text-[#6b675f]">
              Creator · Marketer · Builder
            </p>
            <h1 className="font-serif text-[clamp(3.2rem,11vw,8.5rem)] font-light leading-[0.88] tracking-[-0.03em]">
              Billionaire
              <br />
              <span className="italic">Sabari</span>
              <span className="text-[#00b8d9]">.</span>
            </h1>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-[#3d3a35]">
              Documenting the road from zero to a billion, one post at a time.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href={INSTAGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-full bg-[#111] px-7 py-3.5 text-sm font-medium text-[#f3f0e8] transition-transform hover:-translate-y-0.5"
              >
                Follow the journey <span aria-hidden>→</span>
              </a>
              <span className="text-sm text-[#6b675f]">@billionaire_sabari</span>
            </div>
          </section>

          {/* Portrait as an art piece */}
          <figure className="relative mx-auto w-full max-w-[420px]">
            <div className="absolute -left-4 -top-4 h-full w-full rounded-t-[999px] border border-[#111]" aria-hidden />
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] bg-[#00d0f5]">
              <Image
                src="/sabari.webp"
                alt="Billionaire Sabari"
                fill
                priority
                sizes="(max-width: 768px) 90vw, 420px"
                className="object-cover object-top"
              />
            </div>
            <figcaption className="mt-4 flex justify-between text-[11px] uppercase tracking-[0.25em] text-[#6b675f]">
              <span>Est. 2026</span>
              <span>Chapter one</span>
            </figcaption>
          </figure>
        </main>

        {/* Pillars */}
        <section className="grid border-t border-[#111] md:grid-cols-3">
          {pillars.map((p, i) => (
            <div
              key={p.n}
              className={`py-8 md:px-6 ${i > 0 ? 'border-t border-[#111]/15 md:border-l md:border-t-0' : ''} md:first:pl-0`}
            >
              <span className="font-serif text-sm italic text-[#00a3c2]">{p.n}</span>
              <h2 className="mt-2 text-lg font-medium">{p.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-[#6b675f]">{p.body}</p>
            </div>
          ))}
        </section>

        {/* How the DM works */}
        <section className="border-t border-[#111] py-12 text-center">
          <p className="font-serif text-2xl italic leading-snug sm:text-3xl">
            Comment the keyword on any post.
            <br />
            The link lands in your DMs.
          </p>
        </section>

        <footer className="flex flex-col gap-3 border-t border-[#111]/15 py-6 text-xs text-[#6b675f] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Billionaire Sabari</span>
          <nav className="flex gap-5">
            <Link href="/privacy" className="hover:text-[#111]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#111]">Terms</Link>
            <Link href="/data-deletion" className="hover:text-[#111]">Data deletion</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
