export interface Client {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  archived: boolean;
  clientId: string;
  clientName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeEntry {
  id: string;
  projectId: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  date: string; // YYYY-MM-DD format
  description?: string;
  task?: string; // Task description
}

export interface TimeSlot {
  id: string;
  date: string;
  startTime: string; // HH:MM format
  endTime: string;
  projectId?: string;
  selected: boolean;
}

export type ProjectColor = 
  | '#ef4444' // red
  | '#f97316' // orange
  | '#eab308' // yellow
  | '#22c55e' // green
  | '#3b82f6' // blue
  | '#8b5cf6' // violet
  | '#ec4899' // pink
  | '#6b7280'; // gray
