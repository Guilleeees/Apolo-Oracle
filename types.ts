
export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskType = 'task' | 'reminder';

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskHistoryEntry {
  date: number;
  action: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  type: TaskType;
  isYearly?: boolean;
  isAllDay?: boolean;
  categoryId: string;
  subtasks: SubTask[];
  history: TaskHistoryEntry[];
  createdAt: number;
  dueDate?: string; // Formato YYYY-MM-DD
  dueTime?: string; // Formato HH:mm
}

export interface AISuggestion {
  subtasks: string[];
  estimatedTime: string;
}
