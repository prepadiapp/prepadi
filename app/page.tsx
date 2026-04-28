import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  Wifi,
} from "lucide-react";

import { Reveal } from "@/components/marketing/Reveal";
import { Button } from "@/components/ui/button";

const uspCards = [
  {
    title: "Timed exam practice",
    description:
      "Students practise with seeded papers in a CBT flow that feels familiar, focused, and easier to trust.",
    icon: Clock3,
  },
  {
    title: "Content you control",
    description:
      "Admins publish the papers students can actually access, keeping practice structured and reliable.",
    icon: Database,
  },
  {
    title: "Built for schools too",
    description:
      "Organizations can create examinations, schedule assignments, and review student performance from one workspace.",
    icon: Building2,
  },
];

const featureList = [
  "Students practise only from seeded, published papers",
  "Schools can create examinations, assignments, and subject-specific workflows",
  "Progress and results stay easy to scan for learners and organizations",
  "Offline-ready support helps students continue in low-connectivity moments",
];

const heroHighlights = [
  {
    label: "For students",
    value: "Practice with confidence",
    note: "Timed papers, cleaner focus, and a calmer CBT experience.",
    icon: GraduationCap,
  },
  {
    label: "For schools",
    value: "Run exams with structure",
    note: "Create, publish, assign, and review from one dashboard.",
    icon: LayoutDashboard,
  },
  {
    label: "For real prep",
    value: "Seeded and controlled",
    note: "Only approved papers go live for student practice.",
    icon: BookOpenCheck,
  },
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div className="animate-pulse-glow absolute left-[-10rem] top-24 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(75,113,254,0.18),_transparent_70%)] blur-2xl" />
      <div className="animate-float-soft-delayed absolute right-[-6rem] top-36 -z-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(116,157,255,0.18),_transparent_68%)] blur-3xl" />
      <div className="absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(circle_at_top,_rgba(75,113,254,0.22),_transparent_55%)]" />

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <Reveal y={10}>
          <header className="surface-glass shadow-brand-xl flex items-center justify-between rounded-full border border-[color:var(--primary-border)] px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground shadow-[0_14px_30px_rgba(75,113,254,0.28)]">
                P
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight text-foreground">Prepadi</p>
                <p className="text-xs text-muted-foreground">CBT prep for Nigerian learners</p>
              </div>
            </div>

            <nav className="hidden items-center gap-2 md:flex">
              <Button asChild variant="ghost" className="text-sm text-slate-600 hover:text-primary">
                <Link href="/login">Login</Link>
              </Button>
              <Button
                asChild
                className="rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_16px_40px_rgba(75,113,254,0.25)] hover:bg-[color:var(--primary-hover)]"
              >
                <Link href="/signup">Get Started</Link>
              </Button>
            </nav>
          </header>
        </Reveal>

        <div className="grid flex-1 items-center gap-14 py-14 lg:grid-cols-[1.04fr_0.96fr] lg:py-20">
          <Reveal className="max-w-3xl" delay={80}>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--primary-border)] bg-[color:var(--primary-soft)] px-4 py-2 text-sm font-medium text-[color:var(--primary-ink)]">
              <ShieldCheck className="h-4 w-4" />
              WAEC, JAMB, NECO, and school-based CBT preparation
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
              Exam practice for Nigerian learners, with better structure for schools too.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Prepadi gives students a simpler way to practise with timed papers, while
              schools and tutorial centres manage examinations, assignments, and progress
              from one clean platform.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full px-7 text-base font-semibold shadow-[0_18px_40px_rgba(75,113,254,0.26)] hover:bg-[color:var(--primary-hover)]"
              >
                <Link href="/signup">
                  Start for Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-[color:var(--primary-border)] bg-white/85 px-7 text-base font-semibold text-slate-700 shadow-sm hover:bg-[color:var(--primary-soft)] hover:text-[color:var(--primary-ink)]"
              >
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>

            <div className="mt-10 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              {heroHighlights.map((item, index) => (
                <Reveal
                  key={item.label}
                  delay={180 + index * 90}
                  y={16}
                  className="rounded-2xl border border-white/60 bg-white/72 px-4 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)] backdrop-blur"
                >
                  <div className="mb-3 flex items-center gap-2 text-[color:var(--primary-ink)]">
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium text-slate-900">{item.label}</span>
                  </div>
                  <p className="text-base font-semibold text-slate-950">{item.value}</p>
                  <p className="mt-2 leading-6">{item.note}</p>
                </Reveal>
              ))}
            </div>
          </Reveal>

          <Reveal className="relative" delay={160}>
            <div className="animate-float-soft absolute inset-x-8 top-10 -z-10 h-72 rounded-full bg-[radial-gradient(circle,_rgba(75,113,254,0.18),_transparent_72%)] blur-2xl" />

            <div className="surface-glass shadow-brand-xl rounded-[2rem] border border-white/70 p-5 sm:p-6">
              <div className="rounded-[1.5rem] border border-[color:var(--primary-border)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.95),_rgba(235,241,255,0.92))] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[color:var(--primary-ink)]">Today&apos;s practice</p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-950">JAMB Physics 2013</h2>
                  </div>
                  <div className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_14px_30px_rgba(75,113,254,0.24)]">
                    82%
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition-transform duration-300 hover:-translate-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-900">Timed CBT session</span>
                      <span className="text-muted-foreground">45 mins</span>
                    </div>
                    <div className="mt-3 h-2.5 rounded-full bg-[color:var(--primary-soft)]">
                      <div className="h-2.5 w-[76%] rounded-full bg-primary" />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Familiar question flow, clearer timing, and a steadier practice experience.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-950 p-4 text-white shadow-[0_24px_45px_rgba(15,23,42,0.18)] transition-transform duration-300 hover:-translate-y-1">
                      <div className="flex items-center gap-2 text-sm text-blue-100">
                        <CheckCircle2 className="h-4 w-4" />
                        Performance view
                      </div>
                      <p className="mt-4 text-2xl font-semibold">Stronger review</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Students and schools can quickly see results, patterns, and areas to improve.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--primary-border)] bg-white p-4 shadow-sm transition-transform duration-300 hover:-translate-y-1">
                      <div className="flex items-center gap-2 text-sm text-[color:var(--primary-ink)]">
                        <Wifi className="h-4 w-4" />
                        Low-data ready
                      </div>
                      <p className="mt-4 text-2xl font-semibold text-slate-950">Offline support</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Learners can keep moving even when the internet is inconsistent.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="mt-2 grid gap-4 lg:grid-cols-3">
          {uspCards.map((item, index) => (
            <Reveal
              key={item.title}
              delay={220 + index * 110}
              y={20}
              className="group relative overflow-hidden rounded-[1.75rem] border border-[color:var(--primary-border)] bg-white/82 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_54px_rgba(31,73,221,0.13)]"
            >
              <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[radial-gradient(circle,_rgba(75,113,254,0.14),_transparent_70%)] opacity-80 transition-transform duration-500 group-hover:scale-125" />
              <div className="relative z-10">
                <div className="mb-4 inline-flex rounded-2xl bg-[color:var(--primary-soft)] p-3 text-[color:var(--primary-ink)] shadow-sm">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">{item.title}</h3>
                <p className="mt-3 max-w-md text-sm leading-7 text-slate-600">{item.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-white/60 bg-white/70 py-16 backdrop-blur">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
          <Reveal className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--primary-ink)]">
              How it fits
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              One platform for practice, assignments, and exam operations.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Prepadi is built to stay simple on the surface while supporting the workflows
              that matter underneath: curated paper publishing, structured student practice,
              organization assignments, and easier progress tracking.
            </p>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2">
            {featureList.map((feature, index) => (
              <Reveal
                key={feature}
                delay={120 + index * 90}
                y={16}
                className="rounded-3xl border border-[color:var(--primary-border)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.95),_rgba(241,245,255,0.9))] p-5 shadow-[0_18px_34px_rgba(15,23,42,0.05)] transition-transform duration-300 hover:-translate-y-1"
              >
                <CheckCircle2 className="h-5 w-5 text-[color:var(--primary-ink)]" />
                <p className="mt-4 text-base font-medium leading-7 text-slate-800">{feature}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-[color:var(--primary-border)] bg-slate-950 px-6 py-10 text-white shadow-[0_32px_80px_rgba(15,23,42,0.24)] sm:px-8 lg:flex lg:items-center lg:justify-between lg:px-12">
            <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,_rgba(75,113,254,0.4),_transparent_70%)] blur-2xl" />
            <div className="relative max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-200">Start now</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Give students a cleaner way to prepare.
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-300">
                Whether you are practising on your own or running assessments for a school,
                Prepadi helps you keep exam preparation structured, calm, and easier to manage.
              </p>
            </div>

            <div className="relative mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-white px-7 text-base font-semibold text-slate-950 hover:bg-blue-50"
              >
                <Link href="/signup">Create Account</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-white/20 bg-white/10 px-7 text-base font-semibold text-white hover:bg-white/14"
              >
                <Link href="/login">Log In</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
