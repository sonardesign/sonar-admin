import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Edit2, Archive, Trash2, Palette, Users } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { Project, ProjectColor, Client } from '../types';
import { Page } from '../components/Page';

const projectColors: ProjectColor[] = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
];

export const Projects: React.FC = () => {
  const { 
    clients, 
    projects, 
    createClient, 
    updateClient, 
    createProject, 
    updateProject, 
    archiveProject, 
    deleteProject 
  } = useAppState();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isClientCreateOpen, setIsClientCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<ProjectColor>('#3b82f6');
  const [showArchived, setShowArchived] = useState(false);

  const handleCreateProject = () => {
    if (newProjectName.trim() && selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId);
      if (client) {
        createProject(newProjectName.trim(), selectedColor, selectedClientId, client.name);
        setNewProjectName('');
        setSelectedClientId('');
        setSelectedColor('#3b82f6');
        setIsCreateOpen(false);
      }
    }
  };

  const handleCreateClient = () => {
    if (newClientName.trim()) {
      createClient(newClientName.trim());
      setNewClientName('');
      setIsClientCreateOpen(false);
    }
  };

  const handleUpdateClient = () => {
    if (editingClient && newClientName.trim()) {
      updateClient(editingClient.id, { name: newClientName.trim() });
      setEditingClient(null);
      setNewClientName('');
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
    setSelectedClientId(project.clientId);
    setSelectedColor(project.color as ProjectColor);
  };

  const filteredProjects = showArchived 
    ? projects.filter(p => p.archived)
    : projects.filter(p => !p.archived);

  // Group projects by client
  const groupedProjects = filteredProjects.reduce((groups, project) => {
    const clientName = project.clientName;
    if (!groups[clientName]) {
      groups[clientName] = [];
    }
    groups[clientName].push(project);
    return groups;
  }, {} as Record<string, Project[]>);

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
                <div>
                  <Label>Project Color</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {projectColors.map((color) => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${
                          selectedColor === color ? 'border-foreground' : 'border-border'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setSelectedColor(color)}
                      />
                    ))}
                  </div>
                </div>
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
          {Object.entries(groupedProjects).map(([clientName, clientProjects]) => (
            <div key={clientName}>
              {/* Client Header */}
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">{clientName}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEditingClient(clients.find(c => c.name === clientName)!)}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Projects List for this Client */}
              <Card>
                <CardContent className="p-0">
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
                              Created {project.createdAt.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                              {project.updatedAt.getTime() !== project.createdAt.getTime() && (
                                <span>
                                  {' • Updated '}
                                  {project.updatedAt.toLocaleDateString('en-US', {
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
                                onClick={() => updateProject(project.id, { archived: false })}
                                className="h-8 w-8 p-0"
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
            <div>
              <Label>Project Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {projectColors.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      selectedColor === color ? 'border-foreground' : 'border-border'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingClient(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateClient} disabled={!newClientName.trim()}>
                Update Client
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
};
