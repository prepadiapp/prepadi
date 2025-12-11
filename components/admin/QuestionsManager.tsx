'use client';

import { useEffect, useState } from 'react';
import { Exam, Subject, Tag } from '@prisma/client';  
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, Plus, Search, Trash2, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Toaster, toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { generatePaginationRange } from '@/lib/pagination';

type QuestionWithDetails = {
  id: string;
  text: string;
  year: number;
  subject: { name: string };
  exam: { shortName: string };
  tags: { name: string }[];
};
type FilterData = {
  exams: Exam[];
  subjects: Subject[];
  tags: Tag[];
};

export function QuestionsManager() {
  const router = useRouter();
  
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

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search term to avoid API spam
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const debouncedYear = useDebounce(year, 500);

  // 1. Fetch data for the filter dropdowns (once on mount)
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
      } catch (err: any) {
        setError('Failed to load filters. Please refresh.');
      }
    };
    fetchFilterData();
  }, []);

  // 2. Fetch questions whenever filters change
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(currentPage));
        if (debouncedSearchTerm) params.set('q', debouncedSearchTerm);
        if (subjectId !== 'all') params.set('subjectId', subjectId);
        if (examId !== 'all') params.set('examId', examId);
        if (debouncedYear) params.set('year', debouncedYear); 
        if (tagId !== 'all') params.set('tagId', tagId);

        const response = await fetch(`/api/admin/questions?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch questions');
        
        const data = await response.json();
        setQuestions(data.questions);
        setTotalPages(data.totalPages);
        
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [debouncedSearchTerm, subjectId, examId, debouncedYear, tagId, currentPage]); 

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, subjectId, examId, debouncedYear, tagId]);
  
 
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/admin/questions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete question');
      
      toast.success('Question deleted successfully');
      // Refetch questions
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Generate the list of pages to show
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const paginationRange = generatePaginationRange(currentPage, totalPages);

  
  return (
    <div className="space-y-4">
      <Toaster richColors />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Question List</h1>
        <Button asChild size="sm" className="w-full sm:w-auto text-xs font-semibold h-9">
          <Link href="/admin/questions/new">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Question
          </Link>
        </Button>
      </div>

      {/* Filters Card */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-3 md:p-4">
          {/* Row 1: Search */}
          <div className="mb-3 md:mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="search"
                type="search"
                placeholder="Search by question text..."
                className="pl-8 h-9 text-xs md:text-sm bg-slate-50/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {/* Row 2: Filters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            {/* Exam Filter */}
            <div className="space-y-1">
              <Label htmlFor="exam" className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Exam</Label>
              <Select value={examId} onValueChange={setExamId}>
                <SelectTrigger id="exam" className="h-8 text-xs">
                  <SelectValue placeholder="All Exams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Exams</SelectItem>
                  {filterData.exams.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Subject Filter */}
            <div className="space-y-1">
              <Label htmlFor="subject" className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger id="subject" className="h-8 text-xs">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Subjects</SelectItem>
                  {filterData.subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Filter */}
            <div className="space-y-1">
              <Label htmlFor="year" className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Year</Label>
              <Input
                id="year"
                type="number"
                placeholder="Year"
                className="h-8 text-xs"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            
            {/* Tag Filter */}
            <div className="space-y-1">
              <Label htmlFor="tag" className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tag</Label>
              <Select value={tagId} onValueChange={setTagId}>
                <SelectTrigger id="tag" className="h-8 text-xs">
                  <SelectValue placeholder="All Tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Tags</SelectItem>
                  {filterData.tags.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table Card - with overflow-x-auto for mobile */}
      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48 md:h-64">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Alert variant="destructive" className="m-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="h-9 hover:bg-transparent">
                  <TableHead className="w-[40%] min-w-[200px] text-xs font-bold uppercase tracking-wider h-9">Question</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-bold uppercase tracking-wider h-9">Subject</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-bold uppercase tracking-wider h-9">Exam</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-bold uppercase tracking-wider h-9">Year</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-bold uppercase tracking-wider h-9">Tags</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider h-9">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                      No questions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  questions.map((q) => (
                    <TableRow key={q.id} className="group hover:bg-slate-50/50">
                      <TableCell className="font-medium max-w-xs align-top py-3">
                        <div className="line-clamp-2 text-xs md:text-sm text-slate-700 leading-snug">
                            {q.text}
                        </div>
                        {/* Mobile-only details */}
                        <div className="flex flex-wrap gap-1 md:hidden mt-2">
                            <Badge variant="outline" className="text-[10px] h-4 px-1">{q.exam.shortName}</Badge>
                            <span className="text-[10px] text-slate-400">{q.subject.name} • {q.year}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs align-top py-3">{q.subject.name}</TableCell>
                      <TableCell className="hidden md:table-cell align-top py-3">
                        <Badge variant="outline" className="text-[10px] font-medium h-5 bg-white">{q.exam.shortName}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs align-top py-3">{q.year}</TableCell>
                      <TableCell className="hidden md:table-cell align-top py-3">
                        <div className="flex flex-wrap gap-1">
                          {q.tags.slice(0, 3).map(t => (
                              <Badge key={t.name} variant="secondary" className="text-[9px] h-4 px-1 bg-slate-100 text-slate-600 border border-slate-200">
                                  {t.name}
                              </Badge>
                          ))}
                          {q.tags.length > 3 && <span className="text-[9px] text-slate-400">+{q.tags.length - 3}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-top py-3">
                        <div className="flex justify-end gap-1">
                            <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-primary">
                            <Link href={`/admin/questions/${q.id}`}>
                                <Edit className="w-3.5 h-3.5" />
                            </Link>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} className="h-7 w-7 text-slate-400 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!loading && !error && totalPages > 1 && (
        <Pagination className="text-xs">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage - 1);
                }}
                aria-disabled={currentPage === 1}
                className={currentPage === 1 ? 'pointer-events-none opacity-50 h-8 px-2' : 'cursor-pointer h-8 px-2'}
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
                    className="cursor-pointer h-8 w-8 text-xs"
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
                className={currentPage === totalPages ? 'pointer-events-none opacity-50 h-8 px-2' : 'cursor-pointer h-8 px-2'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}