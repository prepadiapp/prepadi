"use client";

import { useEffect, useMemo, useState } from "react";
import { OrgPlanSeatBand, Plan, PlanInterval } from "@prisma/client";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Loader2,
  PhoneCall,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

import { Reveal } from "@/components/marketing/Reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrgPricingPlan = Plan & {
  seatBands: OrgPlanSeatBand[];
};

type OrgPricingExam = {
  id: string;
  name: string;
  shortName: string;
  pricingCategory: "BASE" | "SPECIAL";
  monthlyFlatFee: number;
  yearlyFlatFee: number;
  monthlyPerStudentFee: number;
  yearlyPerStudentFee: number;
};

type OrgPricingQuote = {
  planId: string;
  planName: string;
  interval: "MONTHLY" | "YEARLY";
  seatCount: number;
  selectedBaseExamIds: string[];
  selectedSpecialExamIds: string[];
  selectedExamIds: string[];
  seatBand: {
    minSeats: number;
    maxSeats: number | null;
    perStudent: number;
    isContactSales: boolean;
  };
  lineItems: Array<{
    label: string;
    amount: number;
    kind: "base" | "special_flat" | "special_per_student";
    examId?: string;
  }>;
  amount: number;
  contactSales: boolean;
};

export interface OrgPricingSelectionState {
  planId: string;
  interval: "MONTHLY" | "YEARLY";
  seatCount: number;
  baseExamIds: string[];
  specialExamIds: string[];
}

interface OrganizationPricingConfiguratorProps {
  mode: "checkout" | "select";
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  initialSelection?: Partial<OrgPricingSelectionState>;
  onContinue?: (selection: OrgPricingSelectionState, quote: OrgPricingQuote) => void;
}

const formatNaira = (amount: number) => `N${amount.toLocaleString()}`;

export function OrganizationPricingConfigurator({
  mode,
  title = "Build your organization's plan",
  subtitle = "Choose a tier, set your student count, and pick the exams you want included.",
  ctaLabel = "Continue",
  initialSelection,
  onContinue,
}: OrganizationPricingConfiguratorProps) {
  const [plans, setPlans] = useState<OrgPricingPlan[]>([]);
  const [baseExams, setBaseExams] = useState<OrgPricingExam[]>([]);
  const [specialExams, setSpecialExams] = useState<OrgPricingExam[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selection, setSelection] = useState<OrgPricingSelectionState>({
    planId: initialSelection?.planId || "",
    interval: initialSelection?.interval || "MONTHLY",
    seatCount: initialSelection?.seatCount || 20,
    baseExamIds: initialSelection?.baseExamIds || [],
    specialExamIds: initialSelection?.specialExamIds || [],
  });
  const [quote, setQuote] = useState<OrgPricingQuote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    let isMounted = true;

    const loadCatalog = async () => {
      try {
        const res = await fetch("/api/public/org-pricing");
        if (!res.ok) throw new Error("Failed to load organization pricing.");
        const data = await res.json();

        if (!isMounted) return;

        setPlans(data.plans || []);
        setBaseExams(data.baseExams || []);
        setSpecialExams(data.specialExams || []);

        const firstPlan = (data.plans || [])[0];
        if (firstPlan) {
          setSelection((current) => {
            const nextPlanId = current.planId || firstPlan.id;
            const resolvedPlan =
              (data.plans || []).find((plan: OrgPricingPlan) => plan.id === nextPlanId) || firstPlan;
            const maxBaseExamSelections = resolvedPlan.maxBaseExamSelections ?? null;
            const seededBaseExamIds =
              current.baseExamIds.length > 0
                ? current.baseExamIds
                : (data.baseExams || [])
                    .slice(0, maxBaseExamSelections ?? Math.min(3, (data.baseExams || []).length))
                    .map((exam: OrgPricingExam) => exam.id);

            return {
              ...current,
              planId: nextPlanId,
              baseExamIds: seededBaseExamIds,
            };
          });
        }
      } catch (error: any) {
        setQuoteError(error.message || "Failed to load organization pricing.");
      } finally {
        if (isMounted) setLoadingCatalog(false);
      }
    };

    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selection.planId) || null,
    [plans, selection.planId]
  );

  useEffect(() => {
    if (!selectedPlan) return;

    setSelection((current) => {
      let nextBaseExamIds = current.baseExamIds;
      let nextSpecialExamIds = current.specialExamIds;

      if (
        selectedPlan.maxBaseExamSelections !== null &&
        selectedPlan.maxBaseExamSelections !== undefined &&
        current.baseExamIds.length > selectedPlan.maxBaseExamSelections
      ) {
        nextBaseExamIds = current.baseExamIds.slice(0, selectedPlan.maxBaseExamSelections);
      }

      if (!selectedPlan.allowsSpecialExams && current.specialExamIds.length > 0) {
        nextSpecialExamIds = [];
      }

      if (nextBaseExamIds === current.baseExamIds && nextSpecialExamIds === current.specialExamIds) {
        return current;
      }

      return {
        ...current,
        baseExamIds: nextBaseExamIds,
        specialExamIds: nextSpecialExamIds,
      };
    });
  }, [selectedPlan]);

  useEffect(() => {
    let isMounted = true;

    const fetchQuote = async () => {
      if (!selection.planId) return;
      setQuoting(true);
      setQuoteError("");

      try {
        const res = await fetch("/api/public/org-pricing/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(selection),
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        const data = await res.json();
        if (isMounted) setQuote(data);
      } catch (error: any) {
        if (isMounted) {
          setQuote(null);
          setQuoteError(error.message || "Failed to calculate pricing.");
        }
      } finally {
        if (isMounted) setQuoting(false);
      }
    };

    fetchQuote();

    return () => {
      isMounted = false;
    };
  }, [selection]);

  const toggleExam = (examId: string, kind: "base" | "special") => {
    setSelection((current) => {
      const key = kind === "base" ? "baseExamIds" : "specialExamIds";
      const currentIds = current[key];
      const exists = currentIds.includes(examId);

      if (kind === "base" && selectedPlan?.maxBaseExamSelections && !exists) {
        if (current.baseExamIds.length >= selectedPlan.maxBaseExamSelections) {
          toast.info(`This tier allows only ${selectedPlan.maxBaseExamSelections} base exams.`);
          return current;
        }
      }

      if (kind === "special" && !selectedPlan?.allowsSpecialExams) {
        toast.info("This tier does not allow special exams.");
        return current;
      }

      return {
        ...current,
        [key]: exists ? currentIds.filter((id) => id !== examId) : [...currentIds, examId],
      };
    });
  };

  const handleCheckout = async () => {
    if (!quote || quote.contactSales) return;

    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) {
      toast.error("Missing Paystack public key.");
      return;
    }

    if (!session?.user?.email) {
      toast.error("Could not determine your billing email.");
      return;
    }

    setProcessing(true);
    try {
      const initRes = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selection),
      });

      if (!initRes.ok) throw new Error(await initRes.text());

      const { reference, amount } = await initRes.json();
      const { default: PaystackPop } = await import("@paystack/inline-js");
      const paystack = new PaystackPop();

      paystack.newTransaction({
        key: publicKey,
        email: session?.user?.email,
        amount,
        ref: reference,
        onSuccess: async (transaction: { reference: string }) => {
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference: transaction.reference }),
          });

          if (!verifyRes.ok) {
            toast.error("Payment succeeded but verification failed.");
            setProcessing(false);
            return;
          }

          toast.success("Organization plan updated successfully.");
          window.location.reload();
        },
        onCancel: () => {
          setProcessing(false);
          toast.info("Payment cancelled.");
        },
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to initialize payment.");
      setProcessing(false);
    }
  };

  const handleContinue = () => {
    if (!quote || !onContinue) return;
    onContinue(selection, quote);
  };

  if (loadingCatalog) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Reveal>
        <div className="max-w-3xl">
          <Badge className="rounded-full bg-[color:var(--primary-soft)] px-4 py-1.5 text-[color:var(--primary-ink)] shadow-none">
            Organization pricing
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-base leading-8 text-slate-600">{subtitle}</p>
        </div>
      </Reveal>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Reveal delay={60}>
            <div className="grid gap-4 lg:grid-cols-3">
              {plans.map((plan, index) => {
                const isSelected = selection.planId === plan.id;
                const bullets = Array.isArray(plan.marketingBullets) ? (plan.marketingBullets as string[]) : [];
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() =>
                      setSelection((current) => ({
                        ...current,
                        planId: plan.id,
                        specialExamIds: plan.allowsSpecialExams ? current.specialExamIds : [],
                      }))
                    }
                    className={`group rounded-[1.75rem] border p-5 text-left transition-all duration-300 ${
                      isSelected
                        ? "border-[color:var(--primary)] bg-white shadow-[0_20px_50px_rgba(31,73,221,0.14)]"
                        : "border-[color:var(--primary-border)] bg-white/80 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="rounded-full border-[color:var(--primary-border)] bg-[color:var(--primary-soft)] text-[color:var(--primary-ink)]"
                      >
                        Tier {index + 1}
                      </Badge>
                      {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-slate-950">{plan.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{plan.description}</p>
                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p>
                        {plan.maxBaseExamSelections
                          ? `Up to ${plan.maxBaseExamSelections} base exams`
                          : "Unlimited base exams"}
                      </p>
                      <p>{plan.allowsSpecialExams ? "Special exams available" : "No special exams"}</p>
                      <p>{plan.canCreateCustomExams ? "Custom exam creation included" : "No custom exam creation"}</p>
                    </div>
                    {bullets.length > 0 && (
                      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                        {bullets.slice(0, 3).map((bullet) => (
                          <div key={bullet} className="flex items-start gap-2">
                            <Sparkles className="mt-0.5 h-4 w-4 text-[color:var(--primary-ink)]" />
                            <span>{bullet}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <Card className="overflow-hidden rounded-[1.75rem] border-[color:var(--primary-border)] bg-white/90 shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
              <CardHeader className="border-b border-slate-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(235,241,255,0.88))]">
                <CardTitle className="text-xl text-slate-950">Pricing controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-700">Billing interval</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["MONTHLY", "YEARLY"] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setSelection((current) => ({ ...current, interval: option }))}
                          className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
                            selection.interval === option
                              ? "border-primary bg-primary text-primary-foreground shadow-[0_16px_34px_rgba(75,113,254,0.22)]"
                              : "border-[color:var(--primary-border)] bg-[color:var(--primary-soft)] text-[color:var(--primary-ink)] hover:bg-white"
                          }`}
                        >
                          {option === "MONTHLY" ? "Monthly" : "Yearly"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="seatCount" className="text-sm font-medium text-slate-700">
                      Number of students
                    </Label>
                    <div className="rounded-2xl border border-[color:var(--primary-border)] bg-[color:var(--primary-soft)] p-4">
                      <div className="mb-3 flex items-center justify-between text-sm text-slate-600">
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-[color:var(--primary-ink)]" />
                          Active seats
                        </span>
                        <span className="font-semibold text-slate-950">{selection.seatCount}</span>
                      </div>
                      <input
                        type="range"
                        min={3}
                        max={500}
                        step={1}
                        value={selection.seatCount}
                        onChange={(event) =>
                          setSelection((current) => ({
                            ...current,
                            seatCount: Number(event.target.value),
                          }))
                        }
                        className="w-full accent-[color:var(--primary)]"
                      />
                      <Input
                        id="seatCount"
                        type="number"
                        min={1}
                        value={selection.seatCount}
                        onChange={(event) =>
                          setSelection((current) => ({
                            ...current,
                            seatCount: Number(event.target.value || 0),
                          }))
                        }
                        className="mt-4 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">Choose base exams</h3>
                    <p className="text-sm leading-6 text-slate-600">
                      {selectedPlan?.maxBaseExamSelections
                        ? `This tier includes up to ${selectedPlan.maxBaseExamSelections} base exams.`
                        : "This tier gives access to all selected base exams."}
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {baseExams.map((exam) => {
                      const active = selection.baseExamIds.includes(exam.id);
                      return (
                        <button
                          key={exam.id}
                          type="button"
                          onClick={() => toggleExam(exam.id, "base")}
                          className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                            active
                              ? "border-primary bg-white shadow-[0_16px_34px_rgba(75,113,254,0.16)]"
                              : "border-slate-200 bg-slate-50/80 hover:border-[color:var(--primary-border)] hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-950">{exam.name}</span>
                            {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
                          </div>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{exam.shortName}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">Choose premium exams</h3>
                    <p className="text-sm leading-6 text-slate-600">
                      Add curated premium exams when you need more advanced or special-access content.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {specialExams.map((exam) => {
                      const active = selection.specialExamIds.includes(exam.id);
                      const disabled = !selectedPlan?.allowsSpecialExams;
                      const flatFee =
                        selection.interval === "MONTHLY" ? exam.monthlyFlatFee : exam.yearlyFlatFee;
                      const perStudentFee =
                        selection.interval === "MONTHLY"
                          ? exam.monthlyPerStudentFee
                          : exam.yearlyPerStudentFee;
                      return (
                        <button
                          key={exam.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleExam(exam.id, "special")}
                          className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                            disabled
                              ? "cursor-not-allowed border-slate-200 bg-slate-100/70 opacity-60"
                              : active
                                ? "border-primary bg-white shadow-[0_16px_34px_rgba(75,113,254,0.16)]"
                                : "border-slate-200 bg-slate-50/80 hover:border-[color:var(--primary-border)] hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-950">{exam.name}</span>
                            {active && !disabled && <CheckCircle2 className="h-4 w-4 text-primary" />}
                          </div>
                          <p className="mt-3 text-sm text-slate-600">
                            {formatNaira(flatFee)} flat + {formatNaira(perStudentFee)} per student
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>

        <Reveal delay={180}>
          <Card className="sticky top-6 rounded-[1.75rem] border-[color:var(--primary-border)] bg-slate-950 text-white shadow-[0_30px_70px_rgba(15,23,42,0.24)]">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-2xl">Pricing summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {quoting ? (
                <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-4 text-sm text-slate-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating quote...
                </div>
              ) : null}

              {quoteError ? (
                <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
                  {quoteError}
                </div>
              ) : null}

              {quote ? (
                <>
                  <div className="rounded-3xl bg-white/6 p-5">
                    <p className="text-sm text-slate-300">{quote.planName}</p>
                    <p className="mt-2 text-4xl font-semibold tracking-tight">{formatNaira(quote.amount)}</p>
                    <p className="mt-2 text-sm text-slate-400">
                      {quote.interval === "MONTHLY" ? "per month" : "per year"} for {quote.seatCount} students
                    </p>
                  </div>

                  <div className="space-y-3">
                    {quote.lineItems.map((item) => (
                      <div
                        key={`${item.label}-${item.kind}`}
                        className="flex items-start justify-between gap-3 border-b border-white/8 pb-3 text-sm"
                      >
                        <span className="text-slate-300">{item.label}</span>
                        <span className="font-medium text-white">{formatNaira(item.amount)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    <div className="flex items-center gap-2 text-white">
                      <GraduationCap className="h-4 w-4 text-blue-200" />
                      <span className="font-semibold">Seat band</span>
                    </div>
                    <p className="mt-2 leading-6">
                      {quote.seatBand.maxSeats
                        ? `${quote.seatBand.minSeats}-${quote.seatBand.maxSeats} students`
                        : `${quote.seatBand.minSeats}+ students`}
                    </p>
                  </div>

                  {quote.contactSales ? (
                    <Button
                      type="button"
                      className="h-12 w-full rounded-full bg-white text-slate-950 hover:bg-blue-50"
                      onClick={() =>
                        window.open(
                          "mailto:hello@prepadi.com?subject=Organization%20pricing%20request",
                          "_blank"
                        )
                      }
                    >
                      <PhoneCall className="h-4 w-4" />
                      Contact Sales
                    </Button>
                  ) : mode === "checkout" ? (
                    <Button
                      type="button"
                      className="h-12 w-full rounded-full bg-primary text-primary-foreground hover:bg-[color:var(--primary-hover)]"
                      onClick={handleCheckout}
                      disabled={processing}
                    >
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                      {processing ? "Processing..." : ctaLabel}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="h-12 w-full rounded-full bg-primary text-primary-foreground hover:bg-[color:var(--primary-hover)]"
                      onClick={handleContinue}
                    >
                      <ArrowRight className="h-4 w-4" />
                      {ctaLabel}
                    </Button>
                  )}
                </>
              ) : null}
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
