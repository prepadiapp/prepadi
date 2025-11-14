import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// This is a helper to get the session on the server
export const getAuthSession = () => {
  return getServerSession(authOptions);
};