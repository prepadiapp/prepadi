'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Toaster, toast } from 'sonner';
import { Building2, Filter, Loader2, Pencil, Plus, Shapes, Trash2 } from 'lucide-react';

interface OrganizationOption {
  id: string;
  name: string;
}

interface SubjectRecord {
  id: string;
  name: string;
  apiSlugs?: Record<string, string | string[]> | null;
  ownerType: 'PLATFORM' | 'ORGANIZATION';
  organizationId?: string | null;
  organization?: { id: string; name: string } | null;
  usageCount: number;
  _count: {
    questions: number;
    examPapers: number;
  };
}

interface ApiSlugRow {
  id: string;
  apiName: string;
  slug: string;
}

const createApiSlugRow = (apiName = '', slug = ''): ApiSlugRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  apiName,
  slug,
});

const apiSlugsToRows = (value: Record<string, string | string[]> | null | undefined): ApiSlugRow[] => {
  if (!value) return [createApiSlugRow()];

  const rows: ApiSlugRow[] = [];
  Object.entries(value).forEach(([apiName, slugValue]) => {
    if (Array.isArray(slugValue)) {
      slugValue.forEach((slug) => rows.push(createApiSlugRow(apiName, String(slug))));
      return;
    }
    rows.push(createApiSlugRow(apiName, String(slugValue)));
  });

  return rows.length > 0 ? rows : [createApiSlugRow()];
};

const rowsToApiSlugs = (rows: ApiSlugRow[]) => {
  const grouped = new Map<string, string[]>();

  rows.forEach((row) => {
    const apiName = row.apiName.trim();
    const slug = row.slug.trim();
    if (!apiName || !slug) return;

    const existing = grouped.get(apiName) || [];
    existing.push(slug);
    grouped.set(apiName, existing);
  });

  return Object.fromEntries(
    Array.from(grouped.entries()).map(([apiName, slugs]) => [
      apiName,
      slugs.length === 1 ? slugs[0] : slugs,
    ])
  );
};

const formatApiSlugPreview = (value: Record<string, string | string[]> | null | undefined) => {
  const rows = apiSlugsToRows(value).filter((row) => row.apiName.trim() && row.slug.trim());
  if (rows.length === 0) return 'No API mappings yet';
  return rows.map((row) => `${row.apiName}: ${row.slug}`).join('\n');
};

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectRecord | null>(null);
  const [name, setName] = useState('');
  const [ownerId, setOwnerId] = useState('platform');
  const [apiSlugRows, setApiSlugRows] = useState<ApiSlugRow[]>([createApiSlugRow()]);
  const [filters, setFilters] = useState({
    q: '',
    ownerType: 'all',
    organizationId: 'all',
  });

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  const resetForm = () => {
    setEditingSubject(null);
    setName('');
    setOwnerId('platform');
    setApiSlugRows([createApiSlugRow()]);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (subject: SubjectRecord) => {
    setEditingSubject(subject);
    setName(subject.name);
    setOwnerId(subject.organizationId || 'platform');
    setApiSlugRows(apiSlugsToRows(subject.apiSlugs));
    setDialogOpen(true);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subjectsRes, orgsRes] = await Promise.all([
        fetch(`/api/admin/subjects${query ? `?${query}` : ''}`),
        fetch('/api/admin/organizations'),
      ]);

      if (!subjectsRes.ok) throw new Error('Failed to fetch subjects');
      setSubjects(await subjectsRes.json());
      if (orgsRes.ok) setOrganizations(await orgsRes.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [query]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Subject name is required');
      return;
    }

    const parsedApiSlugs = rowsToApiSlugs(apiSlugRows);

    setSaving(true);
    try {
      const response = await fetch(
        editingSubject ? `/api/admin/subjects/${editingSubject.id}` : '/api/admin/subjects',
        {
          method: editingSubject ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            apiSlugs: parsedApiSlugs,
            organizationId: ownerId === 'platform' ? null : ownerId,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to save subject' }));
        throw new Error(data.error || 'Failed to save subject');
      }

      toast.success(`Subject ${editingSubject ? 'updated' : 'created'}`);
      setDialogOpen(false);
      resetForm();
      void fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save subject');
    } finally {
      setSaving(false);
    }
  };

  const updateApiSlugRow = (id: string, field: 'apiName' | 'slug', value: string) => {
    setApiSlugRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const addApiSlugRow = () => {
    setApiSlugRows((current) => [...current, createApiSlugRow()]);
  };

  const removeApiSlugRow = (id: string) => {
    setApiSlugRows((current) =>
      current.length === 1 ? [createApiSlugRow()] : current.filter((row) => row.id !== id)
    );
  };

  const handleDelete = async (subject: SubjectRecord) => {
    if (!confirm(`Delete ${subject.name}?`)) return;
    try {
      const response = await fetch(`/api/admin/subjects/${subject.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to delete subject' }));
        throw new Error(data.error || 'Failed to delete subject');
      }
      toast.success('Subject deleted');
      void fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete subject');
    }
  };

  return (
    <section className="space-y-6 pb-20">
      <Toaster richColors />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>{editingSubject ? 'Edit Subject' : 'Create Subject'}</DialogTitle>
            <DialogDescription>
              Keep the subject metadata and API slug mappings aligned with the external fetch sources used for question ingestion.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject-name">Subject name</Label>
              <Input
                id="subject-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Government"
              />
            </div>

            <div className="space-y-2">
              <Label>Owner</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">Platform</SelectItem>
                  {organizations.map((organization) => (
                    <SelectItem key={organization.id} value={organization.id}>{organization.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>API slug mappings</Label>
                <Button type="button" variant="outline" size="sm" onClick={addApiSlugRow}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add API
                </Button>
              </div>
              <div className="space-y-3 rounded-2xl border border-[color:var(--primary-border)] bg-[color:var(--primary-soft)] p-4">
                {apiSlugRows.map((row, index) => (
                  <div key={row.id} className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_1fr_auto]">
                    <div className="space-y-2">
                      <Label htmlFor={`api-name-${row.id}`}>API name</Label>
                      <Input
                        id={`api-name-${row.id}`}
                        value={row.apiName}
                        onChange={(e) => updateApiSlugRow(row.id, 'apiName', e.target.value)}
                        placeholder="qboard"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`api-slug-${row.id}`}>Accepted slug</Label>
                      <Input
                        id={`api-slug-${row.id}`}
                        value={row.slug}
                        onChange={(e) => updateApiSlugRow(row.id, 'slug', e.target.value)}
                        placeholder="government"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeApiSlugRow(row.id)}
                        aria-label={`Remove API mapping ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Add one row per provider and accepted slug. If the same API needs multiple accepted slugs, add multiple rows with the same API name.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingSubject ? 'Save Changes' : 'Create Subject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-[2rem] border border-[color:var(--primary-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,255,0.92))] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--primary-border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <Shapes className="h-3.5 w-3.5" />
              Subject Directory
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Manage all subjects</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Platform and organization-owned subjects live here, together with their external API slug mappings and usage footprint.
            </p>
          </div>
          <Button onClick={openCreateDialog} className="rounded-full">
            <Plus className="mr-2 h-4 w-4" />
            Create Subject
          </Button>
        </div>
      </div>

      <Card className="border-[color:var(--primary-border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            Filters
          </CardTitle>
          <CardDescription>Search by owner, organization, or subject name.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-3">
            <Label>Search</Label>
            <Input
              value={filters.q}
              onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))}
              placeholder="Search subject names"
            />
          </div>
          <div className="space-y-2">
            <Label>Owner</Label>
            <Select value={filters.ownerType} onValueChange={(value) => setFilters((current) => ({ ...current, ownerType: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                <SelectItem value="PLATFORM">Platform</SelectItem>
                <SelectItem value="ORGANIZATION">Organization</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Organization</Label>
            <Select value={filters.organizationId} onValueChange={(value) => setFilters((current) => ({ ...current, organizationId: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All organizations</SelectItem>
                {organizations.map((organization) => (
                  <SelectItem key={organization.id} value={organization.id}>{organization.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-[1.75rem] border border-dashed border-[color:var(--primary-border)] bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => (
            <Card key={subject.id} className="border-[color:var(--primary-border)] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={subject.ownerType === 'PLATFORM' ? 'secondary' : 'default'}>
                        {subject.ownerType === 'PLATFORM' ? 'Platform' : 'Organization'}
                      </Badge>
                      <Badge variant="outline">{subject.usageCount} links</Badge>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-950">{subject.name}</h2>
                    <p className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Building2 className="h-3.5 w-3.5" />
                      {subject.organization?.name || 'Platform library'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(subject)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => void handleDelete(subject)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Questions</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{subject._count.questions}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Papers</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{subject._count.examPapers}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[color:var(--primary-border)] bg-[color:var(--primary-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary/70">API Slugs</p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs text-slate-700">
                    {formatApiSlugPreview(subject.apiSlugs)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
