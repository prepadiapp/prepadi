'use client';

import { useEffect, useMemo, useState } from 'react';
import { ContentStatus, Exam, QuestionType, Subject, Tag } from '@prisma/client';
import Link from 'next/link';
import { AlertCircle, Edit, Flag, Loader2, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/useDebounce';
import { generatePaginationRange } from '@/lib/pagination';

type QuestionWithDetails = {
  id: string;
  text: string;
  year: number | null;
  type: QuestionType;
  moderationStatus: ContentStatus;
  isFlagged: boolean;
  subject: { name: string } | null;
  exam: { shortName: string };
  tags: { name: string }[];
  paper: {
    id: string;
    title: string;
    paperLabel: string | null;
    status: ContentStatus;
  } | null;
};

type FilterData = {
  exams: Exam[];
  subjects: Subject[];
  tags: Tag[];
};

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function statusBadgeVariant(status: ContentStatus) {
  if (status === ContentStatus.PUBLISHED) return 'default';
  if (status === ContentStatus.ARCHIVED) return 'destructive';
  return 'secondary';
}

function resolveDisplayStatus(question: QuestionWithDetails) {
  return question.paper?.status ?? question.moderationStatus;
}

export default function ManageQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionWithDetails[]>([]);
  const [filterData, setFilterData] = useState<FilterData>({
    exams: [],
    subjects: [],
    tags: [],
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [subjectId, setSubjectId] = useState('all');
  const [examId, setExamId] = useState('all');
  const [year, setYear] = useState('');
  const [tagId, setTagId] = useState('all');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [flagged, setFlagged] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const debouncedYear = useDebounce(year, 500);

  const activeFilterCount = useMemo(() => {
    return [
      debouncedSearchTerm,
      subjectId !== 'all',
      examId !== 'all',
      debouncedYear,
      tagId !== 'all',
      type !== 'all',
      status !== 'all',
      flagged !== 'all',
    ].filter(Boolean).length;
  }, [debouncedSearchTerm, subjectId, examId, debouncedYear, tagId, type, status, flagged]);

  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [examsRes, subjectsRes, tagsRes] = await Promise.all([
          fetch('/api/admin/exams'),
          fetch('/api/admin/subjects'),
          fetch('/api/admin/tags'),
        ]);

        if (!examsRes.ok || !subjectsRes.ok || !tagsRes.ok) {
          throw new Error('Failed to fetch filter data');
        }

        const [exams, subjects, tags] = await Promise.all([
          examsRes.json(),
          subjectsRes.json(),
          tagsRes.json(),
        ]);

        setFilterData({ exams, subjects, tags });
      } catch {
        setError('Failed to load filters. Please refresh.');
      }
    };

    fetchFilterData();
  }, []);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('page', String(currentPage));
        if (debouncedSearchTerm) params.set('q', debouncedSearchTerm);
        if (subjectId !== 'all') params.set('subjectId', subjectId);
        if (examId !== 'all') params.set('examId', examId);
        if (debouncedYear) params.set('year', debouncedYear);
        if (tagId !== 'all') params.set('tagId', tagId);
        if (type !== 'all') params.set('type', type);
        if (status !== 'all') params.set('status', status);
        if (flagged !== 'all') params.set('flagged', flagged);

        const response = await fetch(`/api/admin/questions?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch questions');

        const data = await response.json();
        setQuestions(data.questions);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [debouncedSearchTerm, subjectId, examId, debouncedYear, tagId, type, status, flagged, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, subjectId, examId, debouncedYear, tagId, type, status, flagged]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/admin/questions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete question');

      toast.success('Question deleted successfully');
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSubjectId('all');
    setExamId('all');
    setYear('');
    setTagId('all');
    setType('all');
    setStatus('all');
    setFlagged('all');
  };

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const paginationRange = generatePaginationRange(currentPage, totalPages);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-slate-50 p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            Question Bank
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Find and edit platform questions</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Search across seeded questions, isolate exact records with filters, and make targeted edits without entering the paper upload flow.
          </p>
        </div>
        <Button asChild className="rounded-full bg-blue-700 px-5 hover:bg-blue-800">
          <Link href="/admin/questions/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Link>
        </Button>
      </div>

      <Card className="border-blue-100 shadow-sm">
        <CardHeader className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-lg text-slate-950">Filters</CardTitle>
            <p className="text-sm text-slate-500">Keep the bank searchable without turning it into a cockpit.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={resetFilters} disabled={activeFilterCount === 0}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search questions</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="search"
                type="search"
                placeholder="Search by question text..."
                className="h-11 rounded-2xl border-slate-200 pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="exam">Exam</Label>
              <Select value={examId} onValueChange={setExamId}>
                <SelectTrigger id="exam" className="rounded-2xl">
                  <SelectValue placeholder="All Exams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams</SelectItem>
                  {filterData.exams.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger id="subject" className="rounded-2xl">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {filterData.subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                placeholder="e.g., 2023"
                className="rounded-2xl"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tag">Tag</Label>
              <Select value={tagId} onValueChange={setTagId}>
                <SelectTrigger id="tag" className="rounded-2xl">
                  <SelectValue placeholder="All Tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {filterData.tags.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Question type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type" className="rounded-2xl">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value={QuestionType.OBJECTIVE}>Objective</SelectItem>
                  <SelectItem value={QuestionType.THEORY}>Theory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Paper status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" className="rounded-2xl">
                  <SelectValue placeholder="All Paper Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Paper Statuses</SelectItem>
                  <SelectItem value={ContentStatus.DRAFT}>Draft</SelectItem>
                  <SelectItem value={ContentStatus.PUBLISHED}>Published</SelectItem>
                  <SelectItem value={ContentStatus.ARCHIVED}>Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="flagged">Review state</Label>
              <Select value={flagged} onValueChange={setFlagged}>
                <SelectTrigger id="flagged" className="rounded-2xl">
                  <SelectValue placeholder="All Questions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Questions</SelectItem>
                  <SelectItem value="true">Flagged only</SelectItem>
                  <SelectItem value="false">Not flagged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-blue-100 shadow-sm">
        <CardHeader className="flex flex-col gap-2 border-b bg-white/80 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-lg text-slate-950">Questions</CardTitle>
            <p className="text-sm text-slate-500">{totalCount.toLocaleString()} matching question{totalCount === 1 ? '' : 's'}</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
            </div>
          ) : error ? (
            <Alert variant="destructive" className="m-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="min-w-[340px]">Question</TableHead>
                    <TableHead>Context</TableHead>
                    <TableHead className="hidden lg:table-cell">Paper</TableHead>
                    <TableHead className="hidden md:table-cell">Tags</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                        No questions found. Try removing a filter or searching a shorter phrase.
                      </TableCell>
                    </TableRow>
                  ) : (
                    questions.map((q) => (
                      <TableRow key={q.id} className="align-top">
                        <TableCell>
                          <div className="space-y-2">
                            <p className="line-clamp-3 max-w-xl text-sm font-medium leading-relaxed text-slate-900">
                              {stripHtml(q.text) || 'Untitled question'}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">{q.type === QuestionType.THEORY ? 'Theory' : 'Objective'}</Badge>
                              {q.isFlagged && (
                                <Badge variant="destructive" className="gap-1">
                                  <Flag className="h-3 w-3" />
                                  Flagged
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <Badge variant="outline">{q.exam.shortName}</Badge>
                            <p className="text-slate-700">{q.subject?.name || 'No subject'}</p>
                            <p className="text-xs text-slate-500">{q.year || 'No year'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {q.paper ? (
                            <Link href={`/admin/papers/${q.paper.id}`} className="group block max-w-[220px]">
                              <p className="truncate text-sm font-medium text-blue-700 group-hover:underline">{q.paper.title}</p>
                              <p className="text-xs text-slate-500">
                                {q.paper.paperLabel || q.paper.status.toLowerCase()}
                              </p>
                            </Link>
                          ) : (
                              <span className="text-sm text-slate-400">Not linked</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex max-w-[220px] flex-wrap gap-1">
                            {q.tags.length > 0 ? (
                              q.tags.slice(0, 3).map((t) => <Badge key={t.name} variant="secondary">{t.name}</Badge>)
                            ) : (
                              <span className="text-sm text-slate-400">No tags</span>
                            )}
                            {q.tags.length > 3 && <Badge variant="outline">+{q.tags.length - 3}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(resolveDisplayStatus(q))}>
                            {resolveDisplayStatus(q).toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="icon">
                            <Link href={`/admin/questions/${q.id}`} aria-label="Edit question">
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} aria-label="Delete question">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && !error && totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage - 1);
                }}
                aria-disabled={currentPage === 1}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>

            {paginationRange.map((page, index) => {
              if (page === '...') {
                return (
                  <PaginationItem key={index}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }

              return (
                <PaginationItem key={index}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(page as number);
                    }}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage + 1);
                }}
                aria-disabled={currentPage === totalPages}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </section>
  );
}
