import Image from 'next/image';
import Link from 'next/link';

export const dynamic = 'force-static';

const INSTAGRAM = 'https://www.instagram.com/billionaire_sabari';

// Paal pachai (milky green) palette
const MINT = '#d4f7df';
const MINT_DEEP = '#22c55e';

const pillars = [
  { n: '01', title: 'Digital marketing', body: 'Real campaigns, real numbers, shared as they happen.' },
  { n: '02', title: 'AI & automation', body: 'Tools and systems that do the boring work for you.' },
  { n: '03', title: 'Building in public', body: 'Every win and every mistake on the road to a billion.' },
];

const steps = [
  { title: 'Comment the keyword', body: 'Drop the word from the video under any post or reel.' },
  { title: 'Get an instant DM', body: 'The link, guide or PDF lands in your inbox in seconds.' },
  { title: 'Open and use it', body: 'No forms, no waiting. Just tap and go.' },
];

const btnBlack =
  'inline-flex items-center justify-center gap-2 rounded-full bg-[#0b0b0b] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-12px_rgba(0,0,0,0.7)]';
const btnWhite =
  'inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#0b0b0b] bg-white px-6 py-3 text-sm font-semibold text-[#0b0b0b] shadow-[4px_4px_0_#0b0b0b] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#0b0b0b] active:translate-y-0 active:shadow-[2px_2px_0_#0b0b0b]';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#0b0b0b] selection:bg-[#bff0cf]">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-[#22c55e] ring-offset-2">
              <Image src="/sabari.webp" alt="" fill sizes="36px" className="object-cover object-top" priority />
            </span>
            <span className="text-[15px] font-bold tracking-tight">
              Billionaire Sabari<span style={{ color: MINT_DEEP }}>.</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <a
              href={INSTAGRAM}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-black/70 transition-colors hover:bg-black/5 hover:text-black sm:inline-flex"
            >
              Instagram
            </a>
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-[#0b0b0b] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6)] transition-transform hover:-translate-y-0.5">
              Dashboard <span aria-hidden>→</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero: the mint main area */}
        <section
          className="relative mt-6 overflow-hidden rounded-[32px] px-6 py-12 shadow-[0_30px_80px_-30px_rgba(16,94,48,0.45)] sm:rounded-[44px] sm:px-12 sm:py-16"
          style={{ background: `linear-gradient(160deg, ${MINT} 0%, #e9fbef 55%, #c2f0d1 100%)` }}
        >
          {/* soft decorative blobs */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/50 blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-[#9be7b4]/40 blur-3xl" aria-hidden />

          <div className="relative grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold shadow-[0_6px_20px_-8px_rgba(0,0,0,0.25)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
                </span>
                Building in public, every day
              </span>

              <h1 className="mt-6 text-[clamp(2.6rem,7.5vw,5.2rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">
                Zero to a
                <br />
                billion.{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">Live.</span>
                  <span className="absolute inset-x-0 bottom-1 z-0 h-4 rounded-sm bg-white sm:h-5" aria-hidden />
                </span>
              </h1>

              <p className="mt-6 max-w-md text-base leading-relaxed text-black/70 sm:text-lg">
                I&apos;m Sabari. I document the whole journey: digital marketing, AI automation, and
                every win and mistake along the way.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" className={btnBlack}>
                  Follow on Instagram <span aria-hidden>↗</span>
                </a>
                <Link href="/dashboard" className={btnWhite}>
                  Open dashboard <span aria-hidden>→</span>
                </Link>
              </div>
            </div>

            {/* Portrait card with floating chat bubbles */}
            <div className="relative mx-auto w-full max-w-[360px] pb-8 pt-4">
              <div className="relative rotate-[2deg] rounded-[28px] bg-white p-3 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)] transition-transform hover:rotate-0">
                <div className="relative aspect-square overflow-hidden rounded-[20px] bg-[#00d0f5]">
                  <Image
                    src="/sabari.webp"
                    alt="Billionaire Sabari"
                    fill
                    priority
                    sizes="(max-width: 768px) 85vw, 340px"
                    className="object-cover object-top"
                  />
                </div>
                <div className="flex items-center justify-between px-1 pb-1 pt-3">
                  <span className="text-sm font-bold">@billionaire_sabari</span>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: MINT, color: '#11713a' }}>
                    Creator
                  </span>
                </div>
              </div>

              {/* comment bubble */}
              <div className="absolute -left-3 top-10 -rotate-[4deg] rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 text-sm shadow-[0_14px_30px_-10px_rgba(0,0,0,0.35)] sm:-left-10">
                <span className="text-black/50">comment</span> <b>LINK</b>
              </div>
              {/* DM bubble */}
              <div className="absolute -right-2 bottom-0 rotate-[3deg] rounded-2xl rounded-br-sm bg-[#0b0b0b] px-4 py-3 text-sm text-white shadow-[0_18px_36px_-12px_rgba(0,0,0,0.6)] sm:-right-8">
                Here&apos;s your link <span aria-hidden>👇</span>
                <div className="mt-1 text-xs" style={{ color: '#86efac' }}>sent instantly</div>
              </div>
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section className="py-16 sm:py-20">
          <h2 className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-black/50">What I share</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {pillars.map((p) => (
              <div
                key={p.n}
                className="group rounded-3xl border border-black/5 bg-white p-7 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.25)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_-18px_rgba(16,94,48,0.4)]"
              >
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-extrabold transition-colors group-hover:bg-[#0b0b0b] group-hover:text-white"
                  style={{ background: MINT }}
                >
                  {p.n}
                </span>
                <h3 className="mt-5 text-xl font-bold tracking-tight">{p.title}</h3>
                <p className="mt-2 leading-relaxed text-black/60">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="rounded-[32px] border border-black/5 bg-white px-6 py-12 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.25)] sm:px-12">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Want the link from a video?</h2>
          <p className="mt-2 text-black/60">Here&apos;s how my DMs work.</p>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0b0b0b] text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6)]">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-bold">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-black/60">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA */}
        <section className="my-16 flex flex-col items-center gap-6 rounded-[32px] bg-[#0b0b0b] px-6 py-14 text-center text-white shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)] sm:my-20">
          <h2 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
            The journey is just getting <span style={{ color: '#86efac' }}>started.</span>
          </h2>
          <a
            href={INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-[#0b0b0b] shadow-[0_10px_30px_-8px_rgba(134,239,172,0.6)] transition-transform hover:-translate-y-0.5"
            style={{ background: '#86efac' }}
          >
            Follow @billionaire_sabari <span aria-hidden>↗</span>
          </a>
        </section>
      </main>

      <footer className="border-t border-black/5">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-black/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} Billionaire Sabari</span>
          <nav className="flex gap-5">
            <Link href="/privacy" className="hover:text-black">Privacy</Link>
            <Link href="/terms" className="hover:text-black">Terms</Link>
            <Link href="/data-deletion" className="hover:text-black">Data deletion</Link>
            <Link href="/dashboard" className="hover:text-black">Dashboard</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
