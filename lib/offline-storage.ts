import { openDB, DBSchema } from 'idb';
import { SanitizedQuestion } from '@/stores/quizStore';

interface OfflineDB extends DBSchema {
  exams: {
    key: string; 
    value: {
      id: string;
      title: string;
      questions: SanitizedQuestion[];
      duration: number;
      savedAt: number;
      examName: string;
      subjectName: string;
      year: number;
    };
  };
  attempts: {
    key: string; 
    value: {
      id: string;
      examKey: string;
      answers: [string, string][];
      timeTaken: number;
      score: number; 
      timestamp: number;
      userId: string;
      synced?: boolean; // Optional field
    };
  };
}

const DB_NAME = 'prepadi-offline-db';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('exams')) {
        db.createObjectStore('exams', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('attempts')) {
        db.createObjectStore('attempts', { keyPath: 'id' });
      }
    },
  });
};

export const saveExamForOffline = async (data: any) => {
  const db = await initDB();
  await db.put('exams', {
    ...data,
    savedAt: Date.now(),
  });
};

export const getOfflineExam = async (id: string) => {
  const db = await initDB();
  return db.get('exams', id);
};

export const getAllOfflineExams = async () => {
  const db = await initDB();
  return db.getAll('exams');
};

export const saveOfflineAttempt = async (attempt: any) => {
  const db = await initDB();
  await db.put('attempts', {
    ...attempt,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    synced: false,
  });
};

export const getPendingAttempts = async () => {
  const db = await initDB();
  return db.getAll('attempts');
};

export const removePendingAttempt = async (id: string) => {
  const db = await initDB();
  await db.delete('attempts', id);
};