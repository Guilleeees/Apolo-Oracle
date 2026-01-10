
export type Priority = 'urgent' | 'high' | 'normal' | 'low';
export type TaskStatus = 'todo' | 'doing' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string; // ISO String
  createdAt: number;
}

export interface Reminder {
  id: string;
  name: string;
  date: string; // ISO String for day/month or specific year
  type: 'birthday' | 'event';
}

export type AppFont = 'Playfair Display' | 'Inter' | 'Lexend' | 'Space Grotesk' | 'JetBrains Mono' | 'Montserrat';

export interface ThemeConfig {
  bg: string;
  surface: string;
  accent: string;
  font: AppFont;
}

// Added AISuggestion interface to fix the import error in geminiService.ts
export interface AISuggestion {
  subtasks: string[];
  estimatedTime: string;
}
