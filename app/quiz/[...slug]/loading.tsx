import { LoadingScreen } from '@/components/ui/loading-screen';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
      <LoadingScreen />
    </div>
  );
}