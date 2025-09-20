import { useState, useCallback } from 'react';
import { Project, TimeEntry, ProjectColor } from '../types';

const defaultProjects: Project[] = [
  {
    id: '1',
    name: 'Sample Project',
    color: '#3b82f6',
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const useAppState = () => {
  const [projects, setProjects] = useState<Project[]>(defaultProjects);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

  const createProject = useCallback((name: string, color: ProjectColor) => {
    const newProject: Project = {
      id: Date.now().toString(),
      name,
      color,
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setProjects(prev => [...prev, newProject]);
    return newProject;
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
    ));
  }, []);

  const archiveProject = useCallback((id: string) => {
    updateProject(id, { archived: true });
  }, [updateProject]);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    setTimeEntries(prev => prev.filter(te => te.projectId !== id));
  }, []);

  const createTimeEntry = useCallback((entry: Omit<TimeEntry, 'id'>) => {
    const newEntry: TimeEntry = {
      ...entry,
      id: Date.now().toString(),
    };
    setTimeEntries(prev => [...prev, newEntry]);
    return newEntry;
  }, []);

  const deleteTimeEntry = useCallback((id: string) => {
    setTimeEntries(prev => prev.filter(te => te.id !== id));
  }, []);

  const getActiveProjects = useCallback(() => {
    return projects.filter(p => !p.archived);
  }, [projects]);

  const getProjectById = useCallback((id: string) => {
    return projects.find(p => p.id === id);
  }, [projects]);

  return {
    projects,
    timeEntries,
    createProject,
    updateProject,
    archiveProject,
    deleteProject,
    createTimeEntry,
    deleteTimeEntry,
    getActiveProjects,
    getProjectById,
  };
};
