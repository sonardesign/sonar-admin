import { toast } from 'sonner';

// Generic notification helpers
export const notifications = {
  // Generic success/error
  createSuccess: (entity: string, message: string) => {
    toast.success(`${entity} saved`, {
      description: message,
    });
  },

  createError: (entity: string, message: string) => {
    toast.error(`${entity} failed`, {
      description: message,
    });
  },

  // Client notifications
  client: {
    createSuccess: (clientName: string) => {
      toast.success('Client created', {
        description: `${clientName} has been added successfully.`,
      });
    },
    createError: (message: string) => {
      toast.error('Failed to create client', {
        description: message,
      });
    },
    updateSuccess: (clientName: string) => {
      toast.success('Client updated', {
        description: `${clientName} has been updated successfully.`,
      });
    },
    updateError: (message: string) => {
      toast.error('Failed to update client', {
        description: message,
      });
    },
    deleteSuccess: (clientName: string) => {
      toast.success('Client deleted', {
        description: `${clientName} has been removed.`,
      });
    },
    deleteError: (message: string) => {
      toast.error('Failed to delete client', {
        description: message,
      });
    },
  },

  // Project notifications
  project: {
    createSuccess: (projectName: string) => {
      toast.success('Project created', {
        description: `${projectName} has been added successfully.`,
      });
    },
    createError: (message: string) => {
      toast.error('Failed to create project', {
        description: message,
      });
    },
    updateSuccess: (projectName: string) => {
      toast.success('Project updated', {
        description: `${projectName} has been updated successfully.`,
      });
    },
    updateError: (message: string) => {
      toast.error('Failed to update project', {
        description: message,
      });
    },
    deleteSuccess: (projectName: string) => {
      toast.success('Project deleted', {
        description: `${projectName} has been removed.`,
      });
    },
    deleteError: (message: string) => {
      toast.error('Failed to delete project', {
        description: message,
      });
    },
    archiveSuccess: (projectName: string) => {
      toast.success('Project archived', {
        description: `${projectName} has been archived.`,
      });
    },
  },

  // Time entry notifications
  timeEntry: {
    createSuccess: (description?: string) => {
      toast.success('Time entry created', {
        description: description || 'Time entry has been added successfully.',
      });
    },
    createError: (message: string) => {
      toast.error('Failed to create time entry', {
        description: message,
      });
    },
    updateSuccess: (description?: string) => {
      toast.success('Time entry updated', {
        description: description || 'Time entry has been updated successfully.',
      });
    },
    updateError: (message: string) => {
      toast.error('Failed to update time entry', {
        description: message,
      });
    },
    deleteSuccess: () => {
      toast.success('Time entry deleted', {
        description: 'Time entry has been removed.',
      });
    },
    deleteError: (message: string) => {
      toast.error('Failed to delete time entry', {
        description: message,
      });
    },
  },
};
