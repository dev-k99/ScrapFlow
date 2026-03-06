import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShieldCheck, BarChart3, Smartphone, Scale, FileText, Users,
  ChevronRight, CheckCircle2, Leaf
} from 'lucide-react'

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'SAPS & ITAC Compliant',
    desc: 'Built-in compliance for South African regulations — mandatory seller photos, ID verification, EFT-only payments, and automatic ITAC report generation.',
    color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600',
  },
  {
    icon: Scale,
    title: 'Weighbridge Integration',
    desc: 'Connect directly to your weighbridge via Web Serial API. Live weight readings, automatic net calculation, and manual override for field use.',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  },
  {
    icon: BarChart3,
    title: 'Real-time Dashboards',
    desc: 'Live yard metrics updated via SignalR — tonnage flow, inventory value, margin by grade, top suppliers, and compliance issues at a glance.',
    color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600',
  },
  {
    icon: Smartphone,
    title: 'Mobile-first PWA',
    desc: 'Works offline on tablets and phones around the yard. Drafts sync when connectivity returns. Installable as a native app on any device.',
    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
  },
  {
    icon: FileText,
    title: 'Digital Ticket Flow',
    desc: '6-step inbound ticket wizard — supplier selection, gross/tare weighing, material grading, photo compliance, EFT payment, and digital signature.',
    color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600',
  },
  {
    icon: Users,
    title: 'Supplier & Buyer Portals',
    desc: 'Self-service portals for suppliers to view ticket history and statements. Buyer portal for outbound/sales tracking and dispatch documents.',
    color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600',
  },
]

const COMPLIANCE = [
  'SAPS Second-Hand Goods Act 6 of 2009',
  'ITAC Scrap Metal Permit System',
  'POPIA-compliant data handling',
  'EFT-only payment enforcement',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] overflow-x-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <span className="text-white font-black text-base">SF</span>
          </div>
          <span className="font-black text-lg text-[var(--color-text)] tracking-tight">ScrapFlow SA</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
          <Link to="/register" className="btn-brand text-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 md:px-12 pt-16 pb-24 max-w-7xl mx-auto text-center overflow-hidden">
        {/* Gradient mesh */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full
                          bg-emerald-400/10 blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                          bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700
                          text-emerald-700 dark:text-emerald-400 text-sm font-semibold mb-6">
            <Leaf size={14} />
            Purpose-built for South African scrapyards
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-[var(--color-text)] leading-none mb-6">
            Modernize Your
            <br />
            <span className="text-emerald-600">Scrapyard</span>
          </h1>

          <p className="text-lg md:text-xl text-[var(--color-text-muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
            The complete scrap metal management platform — SAPS/ITAC compliance built-in,
            real-time weighbridge integration, and live dashboards. From waste pickers to industrial dealers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="btn-brand text-base px-8 py-3 w-full sm:w-auto">
              Sign In to Your Yard <ChevronRight size={18} />
            </Link>
            <Link to="/register" className="btn-ghost text-base px-8 py-3 w-full sm:w-auto">
              Register New Yard
            </Link>
          </div>
        </motion.div>

        {/* Compliance badges */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="relative z-10 mt-16 flex flex-wrap justify-center gap-3"
        >
          {COMPLIANCE.map((item) => (
            <div key={item}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                         bg-[var(--color-surface)] border border-[var(--color-border)]
                         text-[var(--color-text-muted)] shadow-sm">
              <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
              {item}
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features grid */}
      <section className="px-6 md:px-12 py-16 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-black text-[var(--color-text)] tracking-tight mb-3">
            Everything your yard needs
          </h2>
          <p className="text-[var(--color-text-muted)] max-w-xl mx-auto">
            From weighbridge to ITAC report — every step of the scrap metal trading process, compliant and digital.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="glass-card hover:shadow-lg transition-shadow"
            >
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${f.color}`}>
                <f.icon size={20} />
              </div>
              <h3 className="font-bold text-[var(--color-text)] mb-2">{f.title}</h3>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-20 max-w-7xl mx-auto text-center">
        <div className="gradient-brand rounded-3xl p-12 md:p-16 shadow-2xl shadow-emerald-200/50 dark:shadow-emerald-900/30">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Ready to go digital?
          </h2>
          <p className="text-emerald-100 mb-8 max-w-md mx-auto">
            Get your yard compliant and efficient from day one. No setup fees, no contracts.
          </p>
          <Link to="/register"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl
                       bg-white text-emerald-700 font-bold text-base
                       hover:bg-emerald-50 transition-colors shadow-lg">
            Create Your Account <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] px-6 md:px-12 py-8 max-w-7xl mx-auto
                         flex flex-col sm:flex-row items-center justify-between gap-3
                         text-sm text-[var(--color-text-muted)]">
        <span className="font-semibold">ScrapFlow SA &copy; {new Date().getFullYear()}</span>
        <span>Built for South African scrapyards</span>
      </footer>
    </div>
  )
}
