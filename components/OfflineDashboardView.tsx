'use client';

import { useEffect, useState } from 'react';
import { getAllOfflineExams, initDB } from '@/lib/offline-storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WifiOff, Play, Trash2, Clock, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Props {
    onBack?: () => void;
}

export function OfflineDashboardView({ onBack }: Props) {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadExams = async () => {
    try {
      const data = await getAllOfflineExams();
      setExams(data);
    } catch (e) {
      console.error("Failed to load offline exams", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this downloaded exam?")) return;
    try {
        const db = await initDB();
        await db.delete('exams', id);
        toast.success("Exam deleted");
        loadExams();
    } catch (e) {
        toast.error("Failed to delete");
    }
  };

  const handleStart = (id: string) => {
      router.push(`/dashboard/offline/play/${id}`);
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2"/>Loading downloads...</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-100 rounded-full">
                <WifiOff className="w-6 h-6 text-slate-600" />
            </div>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Offline Exams</h1>
                <p className="text-slate-500">Access your downloads without internet.</p>
            </div>
          </div>
          {onBack && (
              <Button variant="ghost" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
          )}
      </div>

      {exams.length === 0 ? (
        <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <WifiOff className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No downloads found</h3>
                <p className="text-slate-500 max-w-sm mt-2">
                    You need to download exams while online to use this feature.
                </p>
            </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => (
                <Card key={exam.id} className="hover:shadow-md transition-shadow bg-white">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-bold">{exam.title}</CardTitle>
                        <CardDescription>{exam.questions.length} Questions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center text-xs text-slate-500 mb-4">
                            <Clock className="w-3 h-3 mr-1" />
                            Downloaded {formatDistanceToNow(exam.savedAt)} ago
                        </div>
                        <div className="flex gap-2">
                            <Button className="flex-1" onClick={() => handleStart(exam.id)}>
                                <Play className="w-4 h-4 mr-2" /> Start
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => handleDelete(exam.id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}
    </div>
  );
}