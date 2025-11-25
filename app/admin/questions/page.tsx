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


export default function ManageQuestionsPage() {
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
    <>
      <Toaster richColors />
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Question List</h1>
          <Button asChild>
            <Link href="/admin/questions/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Link>
          </Button>
        </div>

        {/* Filters Card */}
        <Card>
          <CardContent className="p-4">
            {/* Row 1: Search */}
            <div className="mb-4">
              <Label htmlFor="search">Search Questions</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  type="search"
                  placeholder="Search by question text..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            {/* Row 2: Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Exam Filter */}
              <div>
                <Label htmlFor="exam">Exam</Label>
                <Select value={examId} onValueChange={setExamId}>
                  <SelectTrigger id="exam">
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
              
              {/* Subject Filter */}
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger id="subject">
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

              {/* Year Filter */}
              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  placeholder="e.g., 2023"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>
              
              {/* Tag Filter */}
              <div>
                <Label htmlFor="tag">Tag</Label>
                <Select value={tagId} onValueChange={setTagId}>
                  <SelectTrigger id="tag">
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
            </div>
          </CardContent>
        </Card>

        {/* Results Table Card */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <Alert variant="destructive" className="m-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead className="hidden md:table-cell">Subject</TableHead>
                    <TableHead className="hidden md:table-cell">Exam</TableHead>
                    <TableHead className="hidden md:table-cell">Year</TableHead>
                    <TableHead className="hidden md:table-cell">Tags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No questions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    questions.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {q.text}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{q.subject.name}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">{q.exam.shortName}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{q.year}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {q.tags.map(t => <Badge key={t.name} variant="secondary">{t.name}</Badge>)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="icon">
                            <Link href={`/admin/questions/${q.id}`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
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
    </>
  );
}