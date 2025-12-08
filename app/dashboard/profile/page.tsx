import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, User, Mail, Shield, Building2 } from 'lucide-react';
import Link from 'next/link';
import { SignOutButton } from '@/components/SignOutButton';

export default async function ProfilePage() {
  const session = await getAuthSession();
  if (!session?.user?.id) return null;

  // Fetch fresh user data including organization details
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { 
        organization: { 
            select: { name: true } 
        },
        subscription: {
            include: { plan: true }
        }
    }
  });

  if (!user) return null;

  const isOrgMember = !!user.organization;
  // Determine if they have a personal active subscription or are relying on the org
  const hasPersonalSub = user.subscription && user.subscription.isActive;

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-20">
      <h1 className="text-2xl font-bold">Profile Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <User className="w-4 h-4 mr-2 text-primary" /> Personal Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {user.name?.[0] || 'U'}
                </div>
                <div>
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">Display Name</p>
                </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground">Email Address</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <div>
                <p className="text-sm font-medium capitalize">{user.role.toLowerCase()}</p>
                <p className="text-xs text-muted-foreground">Account Type</p>
            </div>
          </div>

          {/* Organization Badge for Students */}
          {isOrgMember && (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-blue-50 border-blue-100">
                <Building2 className="w-4 h-4 text-blue-600" />
                <div>
                    <p className="text-sm font-medium text-blue-900">{user.organization?.name}</p>
                    <p className="text-xs text-blue-600">Organization</p>
                </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <CreditCard className="w-4 h-4 mr-2 text-primary" /> Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isOrgMember && !hasPersonalSub ? (
             /* --- Case 1: Org Member (No Personal Plan) --- */
             <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-md border border-slate-100">
                    <p className="text-sm font-medium text-slate-900">Managed by Organization</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        Your access to Prepadi is provided by <strong>{user.organization?.name}</strong>. 
                        You do not need a personal subscription.
                    </p>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                    Contact your organization administrator for billing questions.
                </p>
             </div>
          ) : (
             /* --- Case 2: Independent Student OR Org Member with Personal Plan --- */
             <>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Manage your current plan, view payment history, or upgrade your account to unlock more features.
                </p>
                <Button asChild className="w-full" variant="outline">
                    <Link href="/dashboard/billing">Manage Subscription</Link>
                </Button>
             </>
          )}
        </CardContent>
      </Card>

      <div className="pt-4 flex justify-center">
        <SignOutButton /> 
      </div>
    </div>
  );
}