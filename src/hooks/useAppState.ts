import { useState, useCallback } from 'react';
import { Project, TimeEntry, ProjectColor, Client } from '../types';

const defaultClients: Client[] = [
  {
    id: 'client1',
    name: 'Acme Corporation',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'client2',
    name: 'TechStart Inc.',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
  {
    id: 'client3',
    name: 'Global Solutions',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
];

const defaultProjects: Project[] = [
  {
    id: '1',
    name: 'Website Redesign',
    color: '#3b82f6',
    archived: false,
    clientId: 'client1',
    clientName: 'Acme Corporation',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Mobile App Development',
    color: '#22c55e',
    archived: false,
    clientId: 'client1',
    clientName: 'Acme Corporation',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '3',
    name: 'API Integration',
    color: '#f97316',
    archived: false,
    clientId: 'client2',
    clientName: 'TechStart Inc.',
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25'),
  },
  {
    id: '4',
    name: 'Database Migration',
    color: '#ef4444',
    archived: false,
    clientId: 'client2',
    clientName: 'TechStart Inc.',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: '5',
    name: 'Security Audit',
    color: '#8b5cf6',
    archived: false,
    clientId: 'client3',
    clientName: 'Global Solutions',
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-05'),
  },
  {
    id: '6',
    name: 'Legacy System Update',
    color: '#6b7280',
    archived: true,
    clientId: 'client1',
    clientName: 'Acme Corporation',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
];

export const useAppState = () => {
  const [clients, setClients] = useState<Client[]>(defaultClients);
  const [projects, setProjects] = useState<Project[]>(defaultProjects);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

  const createProject = useCallback((name: string, color: ProjectColor, clientId: string = 'client1', clientName: string = 'Default Client') => {
    const newProject: Project = {
      id: Date.now().toString(),
      name,
      color,
      archived: false,
      clientId,
      clientName,
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

  const createClient = useCallback((name: string) => {
    const newClient: Client = {
      id: Date.now().toString(),
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setClients(prev => [...prev, newClient]);
    return newClient;
  }, []);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => 
      c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
    ));
  }, []);

  const deleteClient = useCallback((id: string) => {
    // Don't allow deletion if there are projects associated with this client
    const hasProjects = projects.some(p => p.clientId === id);
    if (hasProjects) {
      throw new Error('Cannot delete client with associated projects');
    }
    setClients(prev => prev.filter(c => c.id !== id));
  }, [projects]);

  const getClientById = useCallback((id: string) => {
    return clients.find(c => c.id === id);
  }, [clients]);

  return {
    clients,
    projects,
    timeEntries,
    createClient,
    updateClient,
    deleteClient,
    getClientById,
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
