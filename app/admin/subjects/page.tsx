import { redirect } from 'next/navigation';

export default function AdminSubjectsRedirectPage() {
  redirect('/admin/exams?tab=subjects');
}
