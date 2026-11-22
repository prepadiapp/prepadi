'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toaster, toast } from 'sonner';
import { Save } from 'lucide-react';

export default function SiteSettingsPage() {
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (!res.ok) throw new Error('Failed to load site settings');
        const data = await res.json();
        setContactPhone(data.contactPhone ?? '');
        setContactEmail(data.contactEmail ?? '');
      } catch (error: any) {
        toast.error(error.message || 'Failed to load site settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactPhone, contactEmail }),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Failed to save site settings');
      }
      const data = await res.json();
      setContactPhone(data.contactPhone);
      setContactEmail(data.contactEmail);
      toast.success('Contact info updated — footer is live');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save site settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Toaster richColors />
      <section className="space-y-6">
        <div className="flex flex-col gap-3 rounded-[1.75rem] border border-[color:var(--primary-border)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(235,241,255,0.88))] px-6 py-6 shadow-[0_22px_52px_rgba(15,23,42,0.06)]">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Site Settings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Contact details shown in the landing page footer. Changes go live immediately.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Footer Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading ? (
              <div className="space-y-4">
                <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Contact phone</Label>
                  <Input
                    id="contact-phone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Contact email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="support@prepadi.com"
                  />
                </div>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
