'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2, Building2, Power } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function UserListActions({ user }: { user: any }) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Edit State
  const [selectedOrg, setSelectedOrg] = useState(user.organizationId || "none");
  const [orgList, setOrgList] = useState<{id: string, name: string}[]>([]);
  
  // Delete State
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
      if (isEditOpen) {
          fetch('/api/admin/organizations/list')
              .then(res => res.json())
              .then(data => setOrgList(data))
              .catch(console.error);
      }
  }, [isEditOpen]);

  const handleUpdateUser = async () => {
      setLoading(true);
      try {
          const res = await fetch(`/api/admin/users`, {
              method: 'PATCH', // Assume PATCH handles updates
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  userId: user.id,
                  organizationId: selectedOrg === "none" ? null : selectedOrg
              })
          });

          if (!res.ok) throw new Error("Update failed");
          
          toast.success("User updated");
          setIsEditOpen(false);
          router.refresh();
      } catch (e) {
          toast.error("Failed to update user");
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteUser = async () => {
      if (deleteConfirmation !== 'delete') return;
      setLoading(true);
      try {
          const res = await fetch(`/api/admin/users?id=${user.id}`, {
              method: 'DELETE'
          });

          if (!res.ok) throw new Error("Delete failed");
          
          toast.success("User deleted permanently");
          setIsDeleteOpen(false);
          router.refresh();
      } catch (e) {
          toast.error("Failed to delete user");
      } finally {
          setLoading(false);
      }
  };

  return (
    <>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit / Assign Org
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const res = await fetch(`/api/admin/users`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            userId: user.id,
                            isActive: !user.isActive,
                          }),
                        });

                        if (!res.ok) throw new Error('Toggle failed');
                        toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`);
                        router.refresh();
                      } catch (error) {
                        toast.error('Failed to update user status');
                      } finally {
                        setLoading(false);
                      }
                    }}
                >
                    <Power className="mr-2 h-4 w-4" /> {user.isActive ? 'Deactivate User' : 'Activate User'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete User
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit User: {user.name}</DialogTitle>
                    <DialogDescription>
                        Assign or reassign this user to an organization.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label>Organization</Label>
                    <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                        <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select Organization" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">-- No Organization (Independent) --</SelectItem>
                            {orgList.map(org => (
                                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateUser} disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-red-600">Delete User Account</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete the user account and remove their data from our servers.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-3">
                    <Label>Type <span className="font-bold">delete</span> to confirm:</Label>
                    <Input 
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="delete"
                        className="border-red-200 focus-visible:ring-red-500"
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                    <Button 
                        variant="destructive" 
                        onClick={handleDeleteUser} 
                        disabled={deleteConfirmation !== 'delete' || loading}
                    >
                        {loading ? "Deleting..." : "Confirm Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}
