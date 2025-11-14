import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MailCheck } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <MailCheck className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Check Your Inbox</CardTitle>
          <CardDescription>We've sent a verification link to your email address.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-center text-gray-600">
            Please click the link in that email to complete your signup. If you don't see it,
            be sure to check your spam folder.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}