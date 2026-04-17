import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock3, MailCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface VerifyEmailPageProps {
  searchParams: Promise<{
    token?: string;
    status?: string;
  }>;
}

const statusCopy: Record<
  string,
  {
    title: string;
    description: string;
    icon: typeof MailCheck;
    tone: string;
  }
> = {
  invalid: {
    title: "Verification link is invalid",
    description: "That verification link could not be matched to an active signup. Request a fresh email and try again.",
    icon: AlertCircle,
    tone: "text-rose-600",
  },
  expired: {
    title: "Verification link expired",
    description: "This verification link has expired. Sign up again or request a fresh verification email.",
    icon: Clock3,
    tone: "text-amber-600",
  },
  missing: {
    title: "Verification link is incomplete",
    description: "We could not find a token in that verification request.",
    icon: AlertCircle,
    tone: "text-rose-600",
  },
  error: {
    title: "Verification failed",
    description: "Something went wrong while trying to verify your email. Please try again shortly.",
    icon: AlertCircle,
    tone: "text-rose-600",
  },
  sent: {
    title: "Check your inbox",
    description: "We've sent a verification link to your email address. Click it to complete your signup.",
    icon: MailCheck,
    tone: "text-emerald-600",
  },
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = params.token;
  const status = params.status || "sent";

  if (token) {
    redirect(`/api/auth/verify/${token}`);
  }

  const content = statusCopy[status] || statusCopy.sent;
  const Icon = content.icon;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,_rgba(75,113,254,0.18),_transparent_55%)]" />

      <Card className="w-full max-w-lg rounded-[1.75rem] border-[color:var(--primary-border)] bg-white/92 shadow-[0_26px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <CardHeader className="pb-4 text-center">
          <div className="mx-auto mb-5 flex h-18 w-18 items-center justify-center rounded-3xl bg-[color:var(--primary-soft)]">
            <Icon className={`h-9 w-9 ${content.tone}`} />
          </div>
          <CardTitle className="text-3xl font-semibold tracking-tight text-slate-950">
            {content.title}
          </CardTitle>
          <CardDescription className="mx-auto mt-2 max-w-md text-base leading-7 text-slate-600">
            {content.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === "sent" ? (
            <div className="rounded-2xl border border-[color:var(--primary-border)] bg-[color:var(--primary-soft)] px-4 py-4 text-sm leading-6 text-slate-700">
              After you click the link in your email, we’ll take you straight to the login page so you can sign in.
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 flex-1 rounded-full">
              <Link href="/login">
                <CheckCircle2 className="h-4 w-4" />
                Go to Login
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 flex-1 rounded-full">
              <Link href="/signup">Back to Signup</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
