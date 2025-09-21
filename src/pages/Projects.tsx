import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Edit2, Archive, Trash2, Palette, Users } from 'lucide-react';
import { useProjectsData } from '../hooks/useProjectsData';
import { useCustomColors } from '../hooks/useCustomColors';
import { ColorPresetSelector } from '../components/ui/color-preset-selector';
import { SimpleColorPicker } from '../components/ui/simple-color-picker';
import { Project, ProjectColor, Client } from '../types';
import { Page } from '../components/Page';


export const Projects: React.FC = () => {
  const { 
    clients, 
    projects, 
    createClient, 
    updateClient, 
    createProject, 
    updateProject, 
    archiveProject, 
    unarchiveProject,
    deleteProject,
    deleteClient,
    loading,
    error,
    clearError,
    refresh 
  } = useProjectsData();
  
  const { allColors, addCustomColor } = useCustomColors();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isClientCreateOpen, setIsClientCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [deleteClientOption, setDeleteClientOption] = useState<'move_to_unassigned' | 'delete_projects'>('move_to_unassigned');
  const [newProjectName, setNewProjectName] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<ProjectColor>('#3b82f6');
  const [showArchived, setShowArchived] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [tempColor, setTempColor] = useState<string>('#3b82f6');

  const handleCreateProject = () => {
    if (newProjectName.trim() && selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId);
      if (client) {
        createProject(newProjectName.trim(), selectedColor, selectedClientId);
        setNewProjectName('');
        setSelectedClientId('');
        setSelectedColor('#3b82f6');
        setIsCreateOpen(false);
      }
    }
  };

  const handleCreateClient = async () => {
    if (newClientName.trim()) {
      console.log('🔄 Creating client:', newClientName.trim());
      const result = await createClient(newClientName.trim());
      if (result) {
        console.log('✅ Client creation successful, closing dialog');
        setNewClientName('');
        setIsClientCreateOpen(false);
        // Refresh data to ensure UI is up to date
        console.log('🔄 Refreshing data after client creation...');
        await refresh();
      } else {
        console.error('❌ Client creation failed');
        // Keep dialog open so user can retry
      }
    }
  };

  const handleUpdateClient = async () => {
    if (editingClient && newClientName.trim()) {
      console.log('🔄 Updating client:', editingClient.id, newClientName.trim());
      await updateClient(editingClient.id, { name: newClientName.trim() });
      console.log('✅ Client update completed');
      setEditingClient(null);
      setNewClientName('');
    }
  };

  const handleDeleteClient = async () => {
    if (deletingClient) {
      console.log('🗑️ Deleting client with option:', deleteClientOption);
      await deleteClient(deletingClient.id, deleteClientOption);
      setDeletingClient(null);
      setDeleteClientOption('move_to_unassigned');
    }
  };

  const startDeletingClient = (client: Client) => {
    setDeletingClient(client);
    const clientProjects = projects.filter(p => p.client_id === client.id || p.clientId === client.id);
    if (clientProjects.length === 0) {
      // No projects, safe to delete immediately
      setDeleteClientOption('move_to_unassigned');
    }
  };

  const startEditingClient = (client: Client) => {
    setEditingClient(client);
    setNewClientName(client.name);
  };

  const handleUpdateProject = () => {
    if (editingProject && newProjectName.trim() && selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId);
      if (client) {
        updateProject(editingProject.id, { 
          name: newProjectName.trim(), 
          color: selectedColor,
          clientId: selectedClientId,
          clientName: client.name
        });
        setEditingProject(null);
        setNewProjectName('');
        setSelectedClientId('');
        setSelectedColor('#3b82f6');
      }
    }
  };

  const startEditing = (project: Project) => {
    setEditingProject(project);
    setNewProjectName(project.name);
    setSelectedClientId(project.client_id || project.clientId || '');
    setSelectedColor(project.color as ProjectColor);
  };

  const handleAddNewColor = () => {
    setTempColor(selectedColor);
    setIsColorPickerOpen(true);
  };

  const handleColorPickerSave = () => {
    setSelectedColor(tempColor as ProjectColor);
    addCustomColor(tempColor);
    setIsColorPickerOpen(false);
  };

  const handleColorPickerCancel = () => {
    setTempColor(selectedColor);
    setIsColorPickerOpen(false);
  };

  const filteredProjects = showArchived 
    ? projects.filter(p => p.is_archived || p.archived)
    : projects.filter(p => !(p.is_archived || p.archived));

  // Debug logging
  console.log('🔍 Projects page debug:', {
    clientsCount: clients.length,
    projectsCount: projects.length,
    filteredProjectsCount: filteredProjects.length,
    clients: clients.map(c => ({ 
      id: c.id.substring(0, 8), 
      name: c.name, 
      is_active: c.is_active,
      created_at: c.created_at?.substring(0, 10)
    })),
    duplicateClientNames: clients.reduce((acc, client) => {
      acc[client.name] = (acc[client.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    showArchived
  });

  // Group projects by client
  const groupedProjects = filteredProjects.reduce((groups, project) => {
    const clientName = project.client_name || project.clientName || 'Unassigned';
    if (!groups[clientName]) {
      groups[clientName] = [];
    }
    groups[clientName].push(project);
    return groups;
  }, {} as Record<string, Project[]>);

  // Add clients with no projects to the grouped list
  const allGroupedProjects = { ...groupedProjects };
  clients.forEach(client => {
    const hasProjects = Object.keys(groupedProjects).includes(client.name);
    if (!hasProjects) {
      allGroupedProjects[client.name] = [];
    }
  });

  console.log('📊 Grouped projects:', Object.keys(allGroupedProjects));

  // Show loading state
  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        </div>
      </Page>
    )
  }

  // Show error state
  if (error) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-2">Error loading projects</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Projects</h1>
          <p className="text-muted-foreground">
            Create and manage your projects for time tracking.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? 'Show Active' : 'Show Archived'}
          </Button>
          <Dialog open={isClientCreateOpen} onOpenChange={setIsClientCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Add New Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Client</DialogTitle>
                <DialogDescription>
                  Add a new client to organize your projects.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">{error}</p>
                    <button 
                      onClick={clearError}
                      className="text-xs text-destructive/70 hover:text-destructive mt-1 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                <div>
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Enter client name..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsClientCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateClient}>
                    Create Client
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Add a new project to track your time.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="relatedClient">Related Client</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter project name..."
                  />
                </div>
                <ColorPresetSelector
                  selectedColor={selectedColor}
                  presetColors={allColors}
                  onColorSelect={(color) => setSelectedColor(color as ProjectColor)}
                  onAddNewColor={handleAddNewColor}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject} disabled={!selectedClientId || !newProjectName.trim()}>
                    Create Project
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Projects List grouped by Client */}
      {filteredProjects.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {showArchived ? 'No Archived Projects' : 'No Active Projects'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {showArchived 
                ? 'You haven\'t archived any projects yet.'
                : 'Create your first project to start tracking time.'
              }
            </p>
            {!showArchived && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(allGroupedProjects).map(([clientName, clientProjects]) => (
            <div key={clientName}>
              {/* Client Header */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{clientName}</h2>
                  {(() => {
                    const clientsWithThisName = clients.filter(c => c.name === clientName);
                    const mainClient = clientsWithThisName[0];
                    return (
                      <div className="text-xs text-muted-foreground mt-1">
                        ID: {mainClient?.id.substring(0, 8)}... | 
                        Status: {mainClient?.is_active ? 'Active' : 'Inactive'} |
                        Created: {mainClient?.created_at?.substring(0, 10)}
                        {clientsWithThisName.length > 1 && (
                          <span className="text-orange-600 font-medium ml-2">
                            ⚠️ {clientsWithThisName.length} duplicates found
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-1">
                  {(() => {
                    const clientsWithThisName = clients.filter(c => c.name === clientName);
                    return clientsWithThisName.length > 1 ? (
                      // Show dropdown for multiple clients with same name
                      <select 
                        className="text-xs border rounded px-2 py-1 mr-2"
                        onChange={(e) => {
                          const selectedClient = clients.find(c => c.id === e.target.value);
                          if (selectedClient) startEditingClient(selectedClient);
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Select client to edit ({clientsWithThisName.length} found)</option>
                        {clientsWithThisName.map((client, idx) => (
                          <option key={client.id} value={client.id}>
                            #{idx + 1}: {client.id.substring(0, 8)}... ({client.is_active ? 'Active' : 'Inactive'})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditingClient(clients.find(c => c.name === clientName)!)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    );
                  })()}
                </div>
              </div>
              
              {/* Projects List for this Client */}
              <Card>
                <CardContent className="p-0">
                  {clientProjects.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <div className="text-sm">No projects for this client yet.</div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => setIsCreateOpen(true)}
                      >
                        Create First Project
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {clientProjects.map((project) => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                        >
                          {/* Left side: Color, Title, and Date */}
                          <div className="flex items-center space-x-4">
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: project.color }}
                            />
                            <div>
                              <h3 className="font-medium text-foreground">{project.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Created {new Date(project.created_at || project.createdAt || Date.now()).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                                {(project.updated_at || project.updatedAt) && 
                                 new Date(project.updated_at || project.updatedAt!).getTime() !== new Date(project.created_at || project.createdAt || Date.now()).getTime() && (
                                  <span>
                                    {' • Updated '}
                                    {new Date(project.updated_at || project.updatedAt!).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          
                          {/* Right side: Status Badge and Action Icons */}
                          <div className="flex items-center space-x-3">
                            <Badge variant={project.archived ? 'secondary' : 'default'}>
                              {project.archived ? 'Archived' : 'Active'}
                            </Badge>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditing(project)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              {!project.archived ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => archiveProject(project.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => unarchiveProject(project.id)}
                                  className="h-8 w-8 p-0"
                                  title="Unarchive Project"
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteProject(project.id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update your project details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editRelatedClient">Related Client</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editProjectName">Project Name</Label>
              <Input
                id="editProjectName"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name..."
              />
            </div>
            <ColorPresetSelector
              selectedColor={selectedColor}
              presetColors={allColors}
              onColorSelect={(color) => setSelectedColor(color as ProjectColor)}
              onAddNewColor={handleAddNewColor}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingProject(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateProject} disabled={!selectedClientId || !newProjectName.trim()}>
                Update Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editClientName">Client Name</Label>
              <Input
                id="editClientName"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Enter client name..."
              />
            </div>
            <div className="flex justify-between">
              <Button 
                variant="destructive" 
                onClick={() => {
                  if (editingClient) {
                    startDeletingClient(editingClient);
                    setEditingClient(null);
                    setNewClientName('');
                  }
                }}
              >
                Delete Client
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingClient(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateClient} disabled={!newClientName.trim()}>
                  Update Client
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Client Confirmation Dialog */}
      <Dialog open={!!deletingClient} onOpenChange={() => setDeletingClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              You are about to delete "{deletingClient?.name}". What should happen to the associated projects?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
                <button 
                  onClick={clearError}
                  className="text-xs text-destructive/70 hover:text-destructive mt-1 underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            
            {deletingClient && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">
                  Projects associated with this client: {projects.filter(p => p.client_id === deletingClient.id || p.clientId === deletingClient.id).length}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Label>Choose deletion option:</Label>
              <div className="space-y-2">
                <div 
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${
                    deleteClientOption === 'move_to_unassigned' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setDeleteClientOption('move_to_unassigned')}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      deleteClientOption === 'move_to_unassigned' ? 'border-primary' : 'border-border'
                    }`}>
                      {deleteClientOption === 'move_to_unassigned' && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Move projects to "Unassigned" client</div>
                      <div className="text-sm text-muted-foreground">
                        Projects will be moved to an "Unassigned" client group. This is the safer option.
                      </div>
                    </div>
                  </div>
                </div>
                <div 
                  className={`p-3 border rounded-md cursor-pointer transition-colors border-destructive/20 ${
                    deleteClientOption === 'delete_projects' ? 'bg-destructive/10' : 'hover:bg-destructive/5'
                  }`}
                  onClick={() => setDeleteClientOption('delete_projects')}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      deleteClientOption === 'delete_projects' ? 'border-destructive' : 'border-border'
                    }`}>
                      {deleteClientOption === 'delete_projects' && (
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-destructive">Delete all associated projects</div>
                      <div className="text-sm text-muted-foreground">
                        ⚠️ This will permanently delete all projects and their time entries. This cannot be undone!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeletingClient(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteClient}>
                {deleteClientOption === 'delete_projects' ? 'Delete Client & Projects' : 'Delete Client'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Color Picker Modal */}
      <Dialog open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
        <DialogContent className="max-w-md">
          <SimpleColorPicker
            value={tempColor}
            onChange={setTempColor}
            onSave={handleColorPickerSave}
            onCancel={handleColorPickerCancel}
          />
        </DialogContent>
      </Dialog>
    </Page>
  );
};
