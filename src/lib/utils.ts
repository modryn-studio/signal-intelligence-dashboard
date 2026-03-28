import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns today's date as YYYY-MM-DD in the user's local timezone.
 *  Never use new Date().toISOString().split('T')[0] — that's UTC and is
 *  wrong for users in UTC-N timezones after local midnight. */
export function localDateStr(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const DAILY_QUESTIONS = [
  'Where is something growing fast but being served poorly?',
  'What do people keep complaining about that no one has fixed?',
  'Which market is 10x bigger than people think it is?',
  'What belief do most people in this space hold that is wrong?',
  'Where is the gap between what people pay for and what they actually need?',
  'What would you build if you knew this trend continued for 5 more years?',
  'Which problem keeps appearing in multiple places at once?',
];

export function getTodayQuestion(): string {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_QUESTIONS[dayOfYear % DAILY_QUESTIONS.length];
}

export function getQuestionForDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_QUESTIONS[dayOfYear % DAILY_QUESTIONS.length];
}
