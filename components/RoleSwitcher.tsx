'use client';

import { UserRole } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Building, Shield } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RoleSwitcherProps {
  currentRole: UserRole;
}

const roles = [
  {
    role: UserRole.STUDENT,
    title: 'Student',
    description: 'Take exams and track your performance.',
    icon: User,
  },
  {
    role: UserRole.ORGANIZATION,
    title: 'Organization',
    description: 'Manage students and set custom exams.',
    icon: Building,
  },
  {
    role: UserRole.ADMIN,
    title: 'Admin',
    description: 'Manage site content and questions.',
    icon: Shield,
  },
];

export function RoleSwitcher({ currentRole }: RoleSwitcherProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRoleChange = async (role: UserRole) => {
    if (role === selectedRole) return;
    
    setIsLoading(true);
    setSelectedRole(role);
    
    try {
      await fetch('/api/user/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      // Refresh the page to load the new dashboard (e.g., /admin)
      router.refresh();
    } catch (error) {
      console.error('Failed to switch role', error);
      // Revert on failure
      setSelectedRole(currentRole);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Switch Your Role</CardTitle>
        <CardDescription>
          You are currently viewing the dashboard as a {currentRole}.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roles.map((roleInfo) => (
          <Button
            key={roleInfo.role}
            variant={selectedRole === roleInfo.role ? 'default' : 'outline'}
            className="h-auto p-4 flex flex-col items-start text-left"
            onClick={() => handleRoleChange(roleInfo.role)}
            disabled={isLoading && selectedRole === roleInfo.role}
          >
            <roleInfo.icon className="w-6 h-6 mb-2" />
            <span className="text-lg font-semibold">{roleInfo.title}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {roleInfo.description}
            </span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}