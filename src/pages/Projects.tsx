import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Edit2, Archive, Trash2, Palette } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { Project, ProjectColor } from '../types';
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
  const { projects, createProject, updateProject, archiveProject, deleteProject } = useAppState();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedColor, setSelectedColor] = useState<ProjectColor>('#3b82f6');
  const [showArchived, setShowArchived] = useState(false);

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim(), selectedColor);
      setNewProjectName('');
      setSelectedColor('#3b82f6');
      setIsCreateOpen(false);
    }
  };

  const handleUpdateProject = () => {
    if (editingProject && newProjectName.trim()) {
      updateProject(editingProject.id, { 
        name: newProjectName.trim(), 
        color: selectedColor 
      });
      setEditingProject(null);
      setNewProjectName('');
      setSelectedColor('#3b82f6');
    }
  };

  const startEditing = (project: Project) => {
    setEditingProject(project);
    setNewProjectName(project.name);
    setSelectedColor(project.color as ProjectColor);
  };

  const filteredProjects = showArchived 
    ? projects.filter(p => p.archived)
    : projects.filter(p => !p.archived);

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
                  <Button onClick={handleCreateProject}>
                    Create Project
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: project.color }}
                  />
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                </div>
                {project.archived && (
                  <Badge variant="secondary">Archived</Badge>
                )}
              </div>
              <CardDescription>
                Created {project.createdAt.toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Updated {project.updatedAt.toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditing(project)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {!project.archived ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => archiveProject(project.id)}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateProject(project.id, { archived: false })}
                    >
                      Restore
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteProject(project.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && (
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
              <Button onClick={handleUpdateProject}>
                Update Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
};
