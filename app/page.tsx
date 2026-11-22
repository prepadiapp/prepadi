// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import {
  Wifi,
  WifiOff,
  CheckCircle2,
  Clock,
  ArrowRight,
  GraduationCap,
  Building2,
  BarChart3,
  MonitorPlay,
  LogOut,
} from 'lucide-react';
import { HeroPin, ExamLogosOverlay } from '@/components/marketing/HeroScrollLock';
import { SiteFooter } from '@/components/marketing/SiteFooter';

// ============================================================================
// SHARED CURATED NIGERIAN EXAM DATA (JAMB, WAEC, NECO)
// ============================================================================
const EXAM_CARDS = [
  {
    id: 'physics',
    tabLabel: 'JAMB Physics',
    badge: 'JAMB UTME • 2024',
    paperCode: 'PHY-204',
    topic: 'Projectile Motion',
    questionNumber: 'Q.14 of 40',
    question:
      'A ball is projected horizontally from the top of a hill with a velocity of 30 m/s. If it reaches the ground in 4 seconds, what is the height of the hill? [g = 10 m/s²]',
    options: [
      { id: 'A', text: '60 m' },
      { id: 'B', text: '80 m' },
      { id: 'C', text: '120 m' },
      { id: 'D', text: '160 m' }
    ],
    correct: 'B',
    explanation: 'Using h = ½gt² → h = 0.5 × 10 × (4)² = 5 × 16 = 80m.'
  },
  {
    id: 'chemistry',
    tabLabel: 'WAEC Chemistry',
    badge: 'WASSCE • 2024',
    paperCode: 'CHM-108',
    topic: 'Gas Laws & Stoichiometry',
    questionNumber: 'Q.08 of 50',
    question:
      'What volume of oxygen at S.T.P is required to completely burn 100 cm³ of methane (CH₄) according to the equation: CH₄ + 2O₂ → CO₂ + 2H₂O?',
    options: [
      { id: 'A', text: '100 cm³' },
      { id: 'B', text: '150 cm³' },
      { id: 'C', text: '200 cm³' },
      { id: 'D', text: '400 cm³' }
    ],
    correct: 'C',
    explanation: 'By Gay-Lussac’s law, 1 vol of CH₄ reacts with 2 vols of O₂ → 100 × 2 = 200 cm³.'
  },
  {
    id: 'english',
    tabLabel: 'WAEC English',
    badge: 'WASSCE • 2024',
    paperCode: 'ENG-109',
    topic: 'Lexis & Opposite in Meaning',
    questionNumber: 'Q.22 of 60',
    question:
      'Choose the word that is nearly OPPOSITE in meaning to the underlined word: The bursar was commended for his FRUGAL handling of school funds.',
    options: [
      { id: 'A', text: 'Prudent' },
      { id: 'B', text: 'Extravagant' },
      { id: 'C', text: 'Transparent' },
      { id: 'D', text: 'Reluctant' }
    ],
    correct: 'B',
    explanation: '“Frugal” means economical or sparing; its direct antonym is “Extravagant”.'
  },
  {
    id: 'maths',
    tabLabel: 'NECO Maths',
    badge: 'NECO SSCE • 2024',
    paperCode: 'MTH-302',
    topic: 'Logarithms & Indices',
    questionNumber: 'Q.09 of 50',
    question: 'Find the value of x for which 2^(2x + 1) = 32.',
    options: [
      { id: 'A', text: 'x = 1.5' },
      { id: 'B', text: 'x = 2.0' },
      { id: 'C', text: 'x = 2.5' },
      { id: 'D', text: 'x = 3.0' }
    ],
    correct: 'B',
    explanation: 'Since 32 = 2⁵, 2x + 1 = 5 → 2x = 4 → x = 2.0.'
  }
];

// VERSION 1: CLEAN MODERN SAAS BENTO (PREPADI BLUE & ORANGE)
// ============================================================================
function VersionOneSaaSBento() {
  const { data: session, status: authStatus } = useSession();
  const [heroMode, setHeroMode] = useState('student'); // 'student' | 'school'
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selectedAns, setSelectedAns] = useState({ 0: 'B' });
  const [isOfflineSim, setIsOfflineSim] = useState(false);
  const [bentoOfflineTest, setBentoOfflineTest] = useState(false);
  const [timeLeft, setTimeLeft] = useState(2685); // 44:45

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft((prev) => (prev > 1 ? prev - 1 : 2700));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const formatClock = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const activeQ = EXAM_CARDS[questionIdx];
  const userPick = selectedAns[questionIdx];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#0000FE] selection:text-white">
      {/* Subtle Top Mesh Glow */}
      <div className="relative overflow-x-clip">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[420px] bg-gradient-to-tr from-[#0000FE]/15 via-[#FF6600]/10 to-[#FF6600]/10 blur-3xl rounded-full"
        />

        {/* Navbar */}
        <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl px-3 sm:px-6 py-3 shadow-xs flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/prepadi_logo.png"
                alt="Prepadi logo"
                className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm sm:h-10 sm:w-10"
              />
              <div>
                <span className="block text-base font-bold leading-none tracking-tight text-slate-900 sm:text-lg">
                  Prepadi
                </span>
                <span className="hidden text-xs font-medium text-slate-500 sm:block">
                  CBT prep for Nigerian learners
                </span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
              <a href="#v1-simulator" className="hover:text-[#0000FE] transition-colors">
                Simulator
              </a>
              <a href="#v1-bento" className="hover:text-[#0000FE] transition-colors">
                Platform Features
              </a>
              <a href="#v1-workflow" className="hover:text-[#0000FE] transition-colors">
                For Schools
              </a>
              <a href="#v1-pricing" className="hover:text-[#0000FE] transition-colors">
                Pricing
              </a>
            </nav>

            <div className="flex shrink-0 items-center gap-1 sm:gap-3">
              {authStatus === 'loading' ? (
                <div aria-label="Checking sign-in status" className="h-9 w-20 animate-pulse rounded-xl bg-slate-100 sm:w-28" />
              ) : session?.user ? (
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:px-4 sm:text-sm"
                >
                  <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Log out
                </button>
              ) : (
                <>
                  <button
                    onClick={() => window.location.assign('/login')}
                    className="px-2 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 sm:px-3 sm:text-sm"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => window.location.assign('/signup')}
                    className="flex items-center gap-1 rounded-xl bg-[#0000FE] px-2.5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-[#0000FE]/20 transition-all hover:bg-[#0000CC] sm:gap-1.5 sm:px-4 sm:text-sm"
                  >
                    <span className="sm:hidden">Start</span>
                    <span className="hidden sm:inline">Get Started</span>
                    <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section: copy left, classroom image right with scroll-locked exam logo reveal */}
        <HeroPin>
        <section className="mx-auto max-w-7xl px-4 pt-8 pb-12 sm:px-6 sm:pt-12 sm:pb-16 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-7 sm:gap-10 lg:grid-cols-12 lg:gap-16">
            {/* Left Column: Streamlined Copy (Cut by ~60%) */}
            <div className="lg:col-span-6 space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold text-slate-900 tracking-tight leading-[1.08]">
                {heroMode === 'student' ? (
                  <>
                    Ace the exam.{' '}
                    <span className="bg-gradient-to-r from-[#0000FE] to-[#FF6600] bg-clip-text text-transparent">
                      Skip the panic.
                    </span>
                  </>
                ) : (
                  <>
                    Run school mocks.{' '}
                    <span className="bg-gradient-to-r from-[#0000FE] to-[#FF6600] bg-clip-text text-transparent">
                      Skip the grading.
                    </span>
                  </>
                )}
              </h1>

              <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
                Real JAMB &amp; WAEC timed practice for students. One-click CBT exams for Nigerian schools—online or offline.
              </p>

              {/* Primary CTAs */}
              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  onClick={() => window.location.assign('/signup')}
                  className="bg-[#0000FE] hover:bg-[#0000CC] text-white font-semibold px-6 py-3.5 rounded-xl shadow-md shadow-[#0000FE]/20 transition-all flex items-center gap-2"
                >
                  <span>
                    {heroMode === 'student'
                      ? 'Start Practising for Free'
                      : 'Set Up Your School Workspace'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setHeroMode(heroMode === 'student' ? 'school' : 'student')}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-semibold px-5 py-3.5 rounded-xl border border-slate-200 shadow-2xs transition-all flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4 text-[#0000FE]" />
                  <span>
                    {heroMode === 'student' ? 'Preview School Mode' : 'Preview Student CBT'}
                  </span>
                </button>
              </div>

              {/* Editorial Proof Strip (V3 messaging) */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-200/80">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">45k+</div>
                  <div className="text-xs font-semibold text-slate-500">
                    Seeded Past Questions
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#0000FE]">100%</div>
                  <div className="text-xs font-semibold text-slate-500">Offline Auto-Save</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#FF6600]">Instant</div>
                  <div className="text-xs font-semibold text-slate-500">Class Broadsheets</div>
                </div>
              </div>
            </div>

            {/* Right Column: image base with exam logos layered on top via scroll */}
            <div className="min-w-0 lg:col-span-6">
              <div className="relative">
                <div className="relative overflow-hidden rounded-3xl border border-slate-200 shadow-lg">
                  <img
                    src="/01.jpeg"
                    alt="Nigerian students practising CBT together on a laptop in a bright classroom"
                    loading="lazy"
                    className="w-full h-64 sm:h-[380px] lg:h-[500px] object-cover"
                  />
                  <ExamLogosOverlay />
                </div>
                <p className="text-[11px] text-slate-500 pt-2">
                  Real classroom CBT practice — Prepadi works on laptops and phones.
                </p>
              </div>
            </div>
          </div>
        </section>
        </HeroPin>
      </div>

      {/* Consolidated Asymmetric Bento Grid */}
      <section id="v1-bento" className="border-y border-slate-200/80 bg-white py-14 sm:py-20 md:py-32">
        <div className="mx-auto max-w-7xl space-y-10 px-4 sm:space-y-12 sm:px-6 lg:space-y-16 lg:px-8">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0000FE]">
              HOW PREPADI FITS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Structured prep in three calm steps.
            </h2>
            <p className="text-slate-600 text-base">
              No cluttered menus or unverified questions. Everything flows from curated papers to instant mastery.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Bento 1 (7 Cols): Timed CBT Practice */}
            <div className="flex flex-col justify-between gap-5 rounded-3xl border border-slate-200/90 bg-slate-50 p-5 sm:p-7 lg:col-span-7">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#0000FE] text-white flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 pt-1">
                  Practice Under Real Timing
                </h3>
                <p className="text-sm text-slate-600 max-w-lg">
                Students practise with real exam timers, question palettes, and authentic JAMB 8-key navigation so exam day feels effortless.
                </p>
              </div>

              <div className="flex flex-1 flex-col justify-center gap-3 rounded-2xl border border-blue-100 bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-700">
                  <span>Question navigator</span>
                  <span className="rounded-full bg-[#EEF2FF] px-2.5 py-1 tabular-nums text-[#0000CC]">14 / 40</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                  <div className="h-full w-[35%] rounded-full bg-[#0000FE]" />
                </div>
                <div className="grid grid-cols-4 gap-2 min-[400px]:grid-cols-8" aria-label="Question progress preview">
                  {Array.from({ length: 8 }, (_, index) => {
                    const number = index + 11;
                    const current = number === 14;
                    const answered = number < 14;
                    return (
                      <span
                        key={number}
                        className={`flex h-9 items-center justify-center rounded-xl border text-xs font-semibold tabular-nums ${
                          current
                            ? 'border-[#0000FE] bg-[#0000FE] text-white shadow-sm'
                            : answered
                              ? 'border-[#DCE4FF] bg-[#EEF2FF] text-[#172B8A]'
                              : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        {number}
                      </span>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#0000FE]" />Current</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#C7D4FF]" />Answered</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-slate-300 bg-white" />To do</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-4">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2" aria-label="Keyboard shortcuts: A to D answer, N next, P previous, S submit, Enter next">
                  {['A', 'B', 'C', 'D', 'N', 'P', 'S', 'ENTER'].map((k) => (
                    <span
                      key={k}
                      className={`flex h-7 ${k === 'ENTER' ? 'w-10' : 'w-7'} items-center justify-center rounded-lg border border-slate-300 bg-slate-100 font-mono text-[10px] font-bold text-slate-700 sm:h-8 ${k === 'ENTER' ? 'sm:w-12' : 'sm:w-8'} sm:text-xs`}
                    >
                      {k === 'ENTER' ? '↵' : k}
                    </span>
                  ))}
                </div>
                <span className="text-[11px] font-semibold leading-snug text-[#0000FE] sm:text-xs">
                  Keyboard Shortcuts Built-In
                </span>
              </div>
            </div>

            {/* Bento 2 (5 Cols): Interactive CBT Preview */}
            <div id="v1-simulator" className="min-w-0 rounded-3xl bg-slate-900 p-4 text-white sm:p-6 lg:col-span-5">
              <div className="mb-4 space-y-1.5 sm:mb-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#FF6600]/30 bg-[#0000FE]/20 text-[#FF6600]">
                  <MonitorPlay className="h-4 w-4" />
                </div>
                <h3 className="pt-1 text-lg font-bold sm:text-xl">Try the CBT experience</h3>
                <p className="text-xs leading-5 text-slate-300 sm:text-sm">
                  Preview a question, choose an answer, and see how Prepadi works.
                </p>
              </div>

              <div className="min-w-0 space-y-3 rounded-2xl border border-slate-200/90 bg-white p-3 text-slate-900 shadow-xl shadow-slate-950/20 sm:space-y-4 sm:p-4">
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between">
                  <div className="inline-flex w-fit max-w-full items-center rounded-xl bg-slate-100 p-1 text-[10px] font-semibold sm:text-xs">
                    <button
                      type="button"
                      onClick={() => setHeroMode('student')}
                      aria-pressed={heroMode === 'student'}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 transition sm:px-2.5 ${heroMode === 'student' ? 'bg-white text-[#0000FE] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <GraduationCap className="h-3.5 w-3.5 shrink-0" /> Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroMode('school')}
                      aria-pressed={heroMode === 'school'}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 transition sm:px-2.5 ${heroMode === 'school' ? 'bg-white text-[#0000FE] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <Building2 className="h-3.5 w-3.5 shrink-0" /> School
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOfflineSim(!isOfflineSim)}
                    aria-pressed={isOfflineSim}
                    className={`inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition sm:text-[11px] ${isOfflineSim ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-[#0000FE]/30 bg-[#0000FE]/5 text-[#0000CC]'}`}
                  >
                    {isOfflineSim ? <WifiOff className="h-3.5 w-3.5 shrink-0" /> : <Wifi className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">{isOfflineSim ? 'Offline · saved locally' : 'Low-data sync active'}</span>
                  </button>
                </div>

                {heroMode === 'student' ? (
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap gap-1.5">
                        {EXAM_CARDS.slice(0, 2).map((card, index) => (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => setQuestionIdx(index)}
                            className={`rounded-lg px-2 py-1.5 text-[10px] font-bold leading-tight transition sm:text-[11px] ${questionIdx === index ? 'bg-[#0000FE] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            {card.tabLabel}
                          </button>
                        ))}
                      </div>
                      <div className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5 font-mono text-[10px] font-bold text-slate-700 sm:text-xs">
                        <Clock className="h-3.5 w-3.5 text-[#0000FE]" /> {formatClock(timeLeft)}
                      </div>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-3/4 rounded-full bg-[#0000FE]" />
                    </div>

                    <div className="min-w-0 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px] font-semibold text-[#0000FE] sm:text-[11px]">
                        <span className="min-w-0 break-words">{activeQ.badge} · {activeQ.topic}</span>
                        <span className="shrink-0">{activeQ.questionNumber}</span>
                      </div>
                      <p className="break-words text-xs font-semibold leading-relaxed text-slate-900 sm:text-sm">{activeQ.question}</p>

                      <div className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2 sm:gap-2">
                        {activeQ.options.map((option) => {
                          const picked = userPick === option.id;
                          const isCorrect = option.id === activeQ.correct;
                          const optionStyle = !userPick
                            ? 'border-slate-200 bg-white text-slate-800 hover:border-[#FF6600]'
                            : picked && isCorrect
                              ? 'border-[#0000FE] bg-[#0000FE]/10 text-[#0000FE]'
                              : picked
                                ? 'border-rose-400 bg-rose-50 text-rose-900'
                                : isCorrect
                                  ? 'border-[#FF6600] bg-[#0000FE]/10 text-[#0000FE]'
                                  : 'border-slate-200 bg-white text-slate-700';

                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setSelectedAns((previous) => ({ ...previous, [questionIdx]: option.id }))}
                              aria-pressed={picked}
                              className={`flex min-w-0 items-center gap-2 rounded-xl border p-2 text-left text-[11px] font-semibold leading-snug transition sm:p-2.5 sm:text-xs ${optionStyle}`}
                            >
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${picked ? 'bg-[#0000FE] text-white' : 'bg-slate-100 text-slate-600'}`}>{option.id}</span>
                              <span className="min-w-0 flex-1 break-words">{option.text}</span>
                              {userPick && isCorrect && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#0000FE]" />}
                            </button>
                          );
                        })}
                      </div>

                      {userPick && (
                        <div className="rounded-lg border border-[#0000FE]/20 bg-[#0000FE]/10 p-2 text-[10px] leading-relaxed text-[#000066] sm:text-[11px]">
                          <strong className="text-[#0000CC]">Instant Review:</strong> {activeQ.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 rounded-xl border border-[#0000FE]/20 bg-[#0000FE]/10 p-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between sm:p-4">
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#0000FE]">School assessment hub</span>
                        <h4 className="mt-1 break-words text-sm font-bold text-slate-900">SS3 Mock UTME — Physics &amp; Chemistry</h4>
                      </div>
                      <span className="w-fit shrink-0 rounded-full bg-[#0000FE] px-2.5 py-1 text-[10px] font-bold text-white">82% Class Avg</span>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { student: 'Chidera Nwosu (SS3A)', status: 'Submitted', score: '88%' },
                        { student: 'Femi Adeyemi (SS3A)', status: 'Submitted', score: '84%' },
                        { student: 'Zainab Bello (SS3B)', status: 'Offline Synced', score: '79%' },
                      ].map((item) => (
                        <div key={item.student} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] sm:text-[11px]">
                          <div className="min-w-0">
                            <div className="truncate font-bold text-slate-900">{item.student}</div>
                            <div className="text-slate-500">{item.status}</div>
                          </div>
                          <span className="shrink-0 rounded-lg bg-[#0000FE]/10 px-2 py-1 font-mono text-xs font-bold text-[#0000FE]">{item.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bento 3 (5 Cols): Offline-First Resilience */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200/90 rounded-3xl p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#0000FE] text-white flex items-center justify-center">
                  <Wifi className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 pt-1">
                  Offline-Ready Support
                </h3>
                <p className="text-sm text-slate-600">
                  Built for Nigerian connectivity. Papers cache locally so students never lose progress during fluctuating network moments.
                </p>
              </div>

              <img
                src="/04.jpg"
                alt="Student holding low-battery phone in classroom showing offline study need"
                loading="lazy"
                className="w-full h-52 object-cover rounded-2xl border border-slate-200"
              />

              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {bentoOfflineTest ? 'Network Disconnected' : 'Connection Active'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {bentoOfflineTest
                      ? 'Auto-saving answers to browser vault'
                      : 'Click button to test offline resilience'}
                  </div>
                </div>
                <button
                  onClick={() => setBentoOfflineTest(!bentoOfflineTest)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    bentoOfflineTest
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {bentoOfflineTest ? 'Restore Network' : 'Test Network Drop'}
                </button>
              </div>
            </div>

            {/* Bento 4 (7 Cols): School Operations & Analytics */}
            <div
              id="v1-workflow"
              className="lg:col-span-7 bg-[#0000FE] text-white rounded-3xl p-7 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-white/15 text-white flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold pt-1">
                  Built for Schools &amp; Tutorial Centres
                </h3>
                <p className="text-sm text-white/80 max-w-lg">
                  Assign seeded past papers or custom school assessments. Students join with a 6-digit code and results export to Excel/PDF.
                </p>
              </div>

              <img
                src="/05.jpg"
                alt="Nigerian teacher reviewing broadsheet results with students behind"
                loading="lazy"
                className="w-full h-56 object-cover rounded-2xl border border-white/20"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { topic: 'Mechanics', pct: '86%', status: 'Strong' },
                  { topic: 'Organic Chem', pct: '74%', status: 'On Track' },
                  { topic: 'Electromagnetism', pct: '48%', status: 'Needs Review' }
                ].map((stat) => (
                  <div
                    key={stat.topic}
                    className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-3.5"
                  >
                    <div className="text-xs text-white/80">{stat.topic}</div>
                    <div className="text-xl font-extrabold mt-0.5">{stat.pct}</div>
                    <div className="text-[11px] text-white/70 mt-0.5">{stat.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* V1 Pricing — V3 naira plans in brand style */}
      <section id="v1-pricing" className="py-24 md:py-32 bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 md:space-y-12">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0000FE]">
              SIMPLE NAIRA PRICING
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Start free. Scale when ready.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            <div className="bg-slate-50 border border-slate-200/90 rounded-3xl p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 px-3 py-1 rounded-full bg-white border border-slate-200">
                    FOR INDIVIDUAL LEARNERS
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#0000FE]">
                    FREE TO START
                  </span>
                </div>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-4xl sm:text-5xl font-extrabold text-slate-900">₦0</span>
                  <span className="text-xs font-semibold text-slate-500">
                    / daily seeded papers (₦1,500/mo Unlimited)
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  Everything a candidate needs to practise WAEC, JAMB &amp; NECO papers calmly.
                </p>
                <ul className="space-y-2.5 pt-2 text-sm font-medium text-slate-700">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0000FE] shrink-0" />
                    <span>Timed CBT simulator with 8-key JAMB shortcuts</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0000FE] shrink-0" />
                    <span>Instant step-by-step explanations &amp; topic breakdown</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0000FE] shrink-0" />
                    <span>Low-data offline mode for uninterrupted practice</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => window.location.assign('/signup')}
                className="w-full bg-[#0000FE] hover:bg-[#0000CC] text-white font-bold text-sm py-3.5 rounded-xl shadow-sm transition-all"
              >
                Create Free Student Account →
              </button>
            </div>

            <div className="bg-slate-900 text-white rounded-3xl p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#FF6600] text-white">
                    FOR SCHOOLS &amp; TUTORIALS
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF6600]">
                    14-DAY FREE TRIAL
                  </span>
                </div>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-4xl sm:text-5xl font-extrabold">₦25,000</span>
                  <span className="text-xs font-semibold text-slate-400">
                    / term per school workspace
                  </span>
                </div>
                <p className="text-sm text-slate-300">
                  Run unlimited internal mocks, class assignments, and CBT drills across JSS1–SS3.
                </p>
                <ul className="space-y-2.5 pt-2 text-sm font-medium text-slate-200">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#FF6600] shrink-0" />
                    <span>Assign seeded WAEC/JAMB papers or custom teacher exams</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#FF6600] shrink-0" />
                    <span>Instant class broadsheets (PDF/CSV) &amp; weak-topic alerts</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#FF6600] shrink-0" />
                    <span>Works in school computer labs even when internet drops</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => window.location.assign('/signup')}
                className="w-full bg-[#FF6600] hover:brightness-95 text-white font-bold text-sm py-3.5 rounded-xl shadow-sm transition-all"
              >
                Launch School Workspace →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Dark CTA Banner — hidden for now (restore by removing the `hidden` class) */}
      <section className="hidden py-24 md:py-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#090D16] text-white rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2">
          <div className="p-8 sm:p-12 flex flex-col justify-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#FF6600]">
              START NOW
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Give students a cleaner way to prepare.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Whether practising solo or running assessments for a school, Prepadi keeps exam prep structured and calm.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-4">
              <button
                onClick={() => window.location.assign('/signup')}
                className="bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm px-6 py-3.5 rounded-full transition-all"
              >
                Create Account
              </button>
              <button
                onClick={() => window.location.assign('/login')}
                className="bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-sm px-6 py-3.5 rounded-full transition-all"
              >
                Log In
              </button>
            </div>
          </div>
          <img
            src="/06.jpg"
            alt="Nigerian students celebrating exam success outside school"
            loading="lazy"
            className="w-full h-72 md:h-full object-cover -scale-x-100"
          />
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />

    </div>
  );
}

// ============================================================================
// MASTER APPLICATION — CLEAN LANDING (EXPLORER BAR REMOVED)
// ============================================================================
export default function App() {
  return (
    <div className="min-h-screen relative">
      {/* Global Typography & Tactile Helper Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,600&family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .font-serif-editorial {
          font-family: 'Fraunces', Georgia, serif;
        }
        .font-sans {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .font-mono-code {
          font-family: 'JetBrains Mono', monospace;
        }
        .tactile-shadow {
          box-shadow: 4px 4px 0px #14281D;
        }
        .tactile-shadow-lg {
          box-shadow: 6px 6px 0px #14281D;
        }
        .tactile-shadow-sm {
          box-shadow: 2px 2px 0px #14281D;
        }
        .tactile-btn {
          border: 2px solid #14281D;
          box-shadow: 4px 4px 0px #14281D;
          transition: transform 0.12s ease, box-shadow 0.12s ease, background-color 0.15s ease;
        }
        .tactile-btn:hover {
          transform: translate(-1px, -1px);
          box-shadow: 5px 5px 0px #14281D;
        }
        .tactile-btn:active {
          transform: translate(3px, 3px);
          box-shadow: 1px 1px 0px #14281D;
        }
        .paper-dot-bg {
          background-image: radial-gradient(#14281D 0.75px, transparent 0.75px);
          background-size: 24px 24px;
        }
      `}</style>

      <VersionOneSaaSBento />
    </div>
  );
}
