import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(date?: Date | string | null) {
  if (!date) {
    return 'Time not set';
  }

  // Support time-only values (e.g. "07:30" or "07:30:00") that are common in Firestore docs.
  if (typeof date === 'string') {
    const timeOnlyMatch = date.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (timeOnlyMatch) {
      const hours = Number(timeOnlyMatch[1]);
      const minutes = Number(timeOnlyMatch[2]);

      if (!Number.isNaN(hours) && !Number.isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        const seededDate = new Date();
        seededDate.setHours(hours, minutes, 0, 0);
        return seededDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return 'Time not set';
  }

  return parsed.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
