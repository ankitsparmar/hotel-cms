import Link from 'next/link';

const FEATURES = [
  {
    title: 'Booking calendar',
    body: 'See every room, every night, at a glance. Drag-free, fast, and built for a busy front desk.',
  },
  {
    title: 'Room types & rate plans',
    body: 'Set a base rate per room type, then layer on dated seasonal or promotional pricing.',
  },
  {
    title: 'Front desk operations',
    body: 'Check guests in and out, capture payments, and generate invoices without leaving the reservation.',
  },
  {
    title: 'Housekeeping board',
    body: 'Track every room from dirty to inspected, with a status log your whole team can see.',
  },
  {
    title: 'Booking.com sync',
    body: 'Map your room types once and let reservations flow in automatically — no double entry.',
  },
  {
    title: 'Reports, always current',
    body: 'Revenue and occupancy update the moment a guest checks out. No end-of-month scramble.',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Get a referral code',
    body: 'Hotel CMS is invite-only while we roll out — ask whoever invited you for a code.',
  },
  {
    n: '2',
    title: 'Set up your property',
    body: 'Add your room types, base rates and team in a few minutes. No onboarding call required.',
  },
  {
    n: '3',
    title: 'Start taking bookings',
    body: 'Direct reservations and Booking.com sync, side by side on one calendar from day one.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MarketingHeader />
      <Hero />
      <FeatureGrid />
      <HowItWorks />
      <ClosingCta />
      <Footer />
    </div>
  );
}

function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={`flex items-center justify-center h-7 w-7 rounded-sm font-black text-sm ${
          light ? 'bg-white text-blue-950' : 'bg-blue-950 text-white'
        }`}
      >
        H
      </span>
      <span className={`font-semibold tracking-tight ${light ? 'text-white' : 'text-gray-900'}`}>Hotel CMS</span>
    </span>
  );
}

function MarketingHeader() {
  return (
    <header className="bg-blue-950">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <Logo light />
        <nav className="flex items-center gap-6">
          <a href="#features" className="hidden sm:inline text-sm text-blue-200 hover:text-white">
            Features
          </a>
          <a href="#how-it-works" className="hidden sm:inline text-sm text-blue-200 hover:text-white">
            How it works
          </a>
          <Link href="/login" className="text-sm text-white font-medium hover:underline">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-white text-blue-950 font-semibold rounded-md px-3 py-1.5 hover:bg-blue-50"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="bg-blue-950">
      <div className="max-w-6xl mx-auto px-4 pt-12 pb-20 sm:pt-16 sm:pb-28 grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
            Run your property from one calendar.
          </h1>
          <p className="mt-4 text-lg text-blue-200 max-w-md">
            Hotel CMS brings reservations, rates, housekeeping and Booking.com sync into a single dashboard —
            built for independent hotels who don&apos;t need enterprise software to run a great property.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-white text-blue-950 font-semibold px-5 py-3 text-sm hover:bg-blue-50"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-blue-700 text-white font-medium px-5 py-3 text-sm hover:bg-blue-900"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-xs text-blue-300">Invite-only during rollout — you&apos;ll need a referral code to sign up.</p>
        </div>
        <CalendarPreview />
      </div>
    </section>
  );
}

// A stylized, illustrative preview of the real booking calendar's layout and
// color legend (see (app)/calendar/page.tsx) — not a live screenshot.
function CalendarPreview() {
  const rows: { room: string; blocks: { span: number; color: string }[] }[] = [
    { room: '101', blocks: [{ span: 2, color: 'bg-gray-100' }, { span: 3, color: 'bg-sky-100' }, { span: 2, color: 'bg-gray-50' }] },
    { room: '102', blocks: [{ span: 1, color: 'bg-gray-50' }, { span: 4, color: 'bg-blue-100' }, { span: 2, color: 'bg-gray-50' }] },
    { room: '103', blocks: [{ span: 3, color: 'bg-gray-50' }, { span: 3, color: 'bg-purple-100' }, { span: 1, color: 'bg-gray-50' }] },
    { room: '104', blocks: [{ span: 7, color: 'bg-red-50' }] },
    { room: '105', blocks: [{ span: 2, color: 'bg-gray-50' }, { span: 2, color: 'bg-sky-100' }, { span: 3, color: 'bg-gray-50' }] },
  ];

  return (
    <div className="rounded-xl bg-white shadow-2xl overflow-hidden">
      <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-3 flex-wrap">
          <LegendDot className="bg-sky-100" label="Confirmed" />
          <LegendDot className="bg-blue-100" label="Checked in" />
          <LegendDot className="bg-purple-100" label="Booking.com" />
          <LegendDot className="bg-red-50" label="Out of order" />
        </div>
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.room} className="flex items-center gap-1.5">
              <div className="w-8 text-[10px] font-medium text-gray-500">{r.room}</div>
              <div className="flex-1 grid grid-cols-7 gap-0.5 h-6">
                {r.blocks.map((b, i) => (
                  <div key={i} className={`${b.color} rounded-sm`} style={{ gridColumn: `span ${b.span} / span ${b.span}` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function FeatureGrid() {
  return (
    <section id="features" className="bg-white">
      <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
        <div className="max-w-xl mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Everything a small property actually needs</h2>
          <p className="mt-3 text-gray-500">No modules to unlock, no per-seat surprises. One dashboard, the whole operation.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-gray-200 p-5 hover:border-blue-200 hover:shadow-sm transition">
              <h3 className="font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-1.5 text-sm text-gray-500">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-gray-50 border-y border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
        <div className="max-w-xl mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Live in an afternoon</h2>
          <p className="mt-3 text-gray-500">No sales calls, no implementation project. Just a calendar that works.</p>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n}>
              <div className="flex items-center justify-center h-9 w-9 rounded-full bg-blue-950 text-white font-semibold text-sm">
                {s.n}
              </div>
              <h3 className="mt-3 font-semibold text-gray-900">{s.title}</h3>
              <p className="mt-1.5 text-sm text-gray-500">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="bg-blue-950">
      <div className="max-w-6xl mx-auto px-4 py-14 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Ready to see it for yourself?</h2>
          <p className="mt-1.5 text-blue-200 text-sm">Bring a referral code and your first property can be live today.</p>
        </div>
        <Link
          href="/signup"
          className="rounded-md bg-white text-blue-950 font-semibold px-5 py-3 text-sm hover:bg-blue-50 whitespace-nowrap"
        >
          Get started
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo />
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <Link href="/login" className="hover:text-gray-700">
            Sign in
          </Link>
          <Link href="/signup" className="hover:text-gray-700">
            Get started
          </Link>
        </div>
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} Hotel CMS</p>
      </div>
    </footer>
  );
}
