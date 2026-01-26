import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { UserManagementDialog } from '@/components/admin/UserManagementDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Building2, ShieldAlert, User as UserIcon } from 'lucide-react';
import { UserListActions } from './UserListActions';

export default async function AdminUsersPage() {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/login');

  const users = await prisma.user.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: {
      organization: true,
      ownedOrganization: {
        include: {
          subscription: {
            include: {
              plan: true
            }
          }
        }
      },
      subscription: { 
        include: { 
          plan: true 
        } 
      }
    }
  });

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage students, organizations, and admins.</p>
        </div>
        <UserManagementDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                // Determine the effective active subscription
                const activeSub = 
                  (user.subscription?.isActive ? user.subscription : null) || 
                  (user.ownedOrganization?.subscription?.isActive ? user.ownedOrganization.subscription : null);

                return (
                  <TableRow key={user.id}>
                    <TableCell className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image || ''} />
                        <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{user.name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        user.role === 'ADMIN' ? 'destructive' : 
                        user.role === 'ORGANIZATION' ? 'default' : 'secondary'
                      } className="gap-1">
                        {user.role === 'ADMIN' && <ShieldAlert className="w-3 h-3"/>}
                        {user.role === 'ORGANIZATION' && <Building2 className="w-3 h-3"/>}
                        {user.role === 'STUDENT' && <UserIcon className="w-3 h-3"/>}
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.ownedOrganization ? (
                        <div className="flex items-center gap-1 text-blue-600 font-medium text-xs">
                          <Building2 className="w-3 h-3" /> {user.ownedOrganization.name} (Owner)
                        </div>
                      ) : user.organization ? (
                        <div className="flex items-center gap-1 text-slate-600 text-xs">
                          {user.organization.name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {activeSub ? (
                        <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
                          {activeSub.plan.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Inactive</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(user.createdAt, 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <UserListActions user={user} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}