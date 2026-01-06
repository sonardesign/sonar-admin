import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Trash2, Edit2, ArrowUpDown } from 'lucide-react';
import { useProjectsData } from '../hooks/useProjectsData';
import { useSupabaseAppState } from '../hooks/useSupabaseAppState';
import { usePersistentState, useLastPage } from '../hooks/usePersistentState';
import { Project } from '../types';
import { Page } from '../components/Page';
import { toast } from 'sonner';

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { saveLastPage } = useLastPage();
  const {
    clients,
    projects,
    updateProject,
    deleteProject,
    loading,
  } = useProjectsData();
  
  // Get time entries to calculate total hours
  const { timeEntries } = useSupabaseAppState();

  // Save current page
  React.useEffect(() => {
    saveLastPage('/projects');
  }, [saveLastPage]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingProject, setRenamingProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  
  // Persistent filters
  const [statusFilter, setStatusFilter] = usePersistentState('projects_statusFilter', 'all');
  const [clientFilter, setClientFilter] = usePersistentState('projects_clientFilter', 'all');
  const [groupBy, setGroupBy] = usePersistentState<'none' | 'status' | 'client' | 'last_edited'>('projects_groupBy', 'none');

  // Filter active projects
  const activeProjects = useMemo(
    () => projects.filter((p) => !(p.is_archived || p.archived)),
    [projects]
  );

  // Handle rename
  const handleRename = async () => {
    if (renamingProject && newProjectName.trim()) {
      try {
        await updateProject(renamingProject.id, { name: newProjectName.trim() });
        toast.success(`Project renamed to "${newProjectName}"`);
        setRenameDialogOpen(false);
        setRenamingProject(null);
        setNewProjectName('');
      } catch (error) {
        toast.error('Failed to rename project');
      }
    }
  };

  // Handle delete
  const handleDelete = async (project: Project) => {
    if (window.confirm(`Are you sure you want to delete "${project.name}"?`)) {
      try {
        console.log('🗑️ Deleting project from UI:', project.id, project.name);
        await deleteProject(project.id);
        console.log('✅ Project deleted from UI');
        toast.success(`Project "${project.name}" deleted successfully`);
      } catch (error) {
        console.error('❌ Error deleting project:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Show appropriate error message
        if (errorMessage.includes('Permission denied') || errorMessage.includes('RLS')) {
          toast.error('Permission denied: Only admins or project creators can delete projects');
        } else {
          toast.error(`Failed to delete project: ${errorMessage}`);
        }
      }
    }
  };

  // Open rename dialog
  const openRenameDialog = (project: Project) => {
    setRenamingProject(project);
    setNewProjectName(project.name);
    setRenameDialogOpen(true);
  };

  // Define columns
  const columns: ColumnDef<Project>[] = useMemo(
    () => [
      // Bulk select column
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value: boolean) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      // Status column
      {
        accessorKey: 'status',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2"
            >
              Status
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const status = row.getValue('status') as string;
          return (
            <Badge variant={status === 'active' ? 'default' : 'secondary'}>
              {status}
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      // Name column
      {
        accessorKey: 'name',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2"
            >
              Name
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const project = row.original;
          return (
            <button
              onClick={() => navigate(`/projects/${encodeURIComponent(project.name)}`)}
              className="font-medium hover:underline text-left flex items-center gap-2"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
              {project.name}
            </button>
          );
        },
      },
      // Client column
      {
        accessorKey: 'client_name',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2"
            >
              Client
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          return <div>{row.getValue('client_name') || 'No Client'}</div>;
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      // Total Hours column
      {
        id: 'total_hours',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2"
            >
              Total Hours
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const project = row.original;
          // Calculate total hours from time entries
          const totalMinutes = timeEntries
            .filter((entry) => entry.project_id === project.id || entry.projectId === project.id)
            .reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
          const totalHours = (totalMinutes / 60).toFixed(1);
          return (
            <div className="text-sm font-medium">
              {totalHours}h
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const getHours = (row: any) => {
            const project = row.original;
            const totalMinutes = timeEntries
              .filter((entry) => entry.project_id === project.id || entry.projectId === project.id)
              .reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
            return totalMinutes / 60;
          };
          return getHours(rowA) - getHours(rowB);
        },
      },
      // Last Edited column
      {
        accessorKey: 'updated_at',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2"
            >
              Last Edited
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const date = row.getValue('updated_at') as string;
          if (!date) return <div className="text-muted-foreground">-</div>;
          return (
            <div className="text-sm">
              {new Date(date).toLocaleDateString()}
            </div>
          );
        },
      },
      // Rename button column
      {
        id: 'rename',
        header: 'Rename',
        cell: ({ row }) => {
          const project = row.original;
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openRenameDialog(project)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          );
        },
        enableSorting: false,
      },
      // Delete button column
      {
        id: 'delete',
        header: '',
        cell: ({ row }) => {
          const project = row.original;
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(project)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          );
        },
        enableSorting: false,
      },
    ],
    [navigate, clients, timeEntries]
  );

  const table = useReactTable({
    data: activeProjects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    // Force re-render when activeProjects changes
    autoResetAll: false,
  });

  // Get unique values for filters
  const uniqueStatuses = useMemo(
    () => Array.from(new Set(activeProjects.map((p) => p.status))),
    [activeProjects]
  );

  const uniqueClients = useMemo(
    () => Array.from(new Set(activeProjects.map((p) => p.client_name || 'No Client'))),
    [activeProjects]
  );

  // Group projects based on groupBy selection
  const groupedProjects = useMemo(() => {
    if (groupBy === 'none') return null;

    const filtered = table.getFilteredRowModel().rows.map(row => row.original);
    const groups: Record<string, Project[]> = {};

    filtered.forEach((project) => {
      let key = '';
      if (groupBy === 'status') {
        key = project.status;
      } else if (groupBy === 'client') {
        key = project.client_name || 'No Client';
      } else if (groupBy === 'last_edited') {
        const date = project.updated_at ? new Date(project.updated_at).toLocaleDateString() : 'Unknown';
        key = date;
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(project);
    });

    return groups;
  }, [groupBy, table]);

  if (loading) {
    return <Page loading={true} loadingText="Loading projects..."><div /></Page>;
  }

  return (
    <Page>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Projects</h1>
            <p className="text-muted-foreground mt-1">
              Manage your projects and clients
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Name filter */}
          <Input
            placeholder="Filter by name..."
            value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('name')?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />

          {/* Group By dropdown */}
          <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Grouping</SelectItem>
              <SelectItem value="status">Group by Status</SelectItem>
              <SelectItem value="client">Group by Client</SelectItem>
              <SelectItem value="last_edited">Group by Last Edited</SelectItem>
            </SelectContent>
          </Select>

          {/* Client filter */}
          <Select
            value={clientFilter}
            onValueChange={(value) => {
              setClientFilter(value);
              table.getColumn('client_name')?.setFilterValue(value === 'all' ? '' : [value]);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {uniqueClients.map((client) => (
                <SelectItem key={client} value={client}>
                  {client}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              table.getColumn('status')?.setFilterValue(value === 'all' ? '' : [value]);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {uniqueStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {groupedProjects ? (
                // Grouped view
                Object.entries(groupedProjects).map(([groupKey, projects]) => (
                  <React.Fragment key={groupKey}>
                    {/* Group header row */}
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={columns.length} className="font-semibold">
                        {groupKey} ({projects.length})
                      </TableCell>
                    </TableRow>
                    {/* Group items */}
                    {projects.map((project) => {
                      const row = table.getRowModel().rows.find(r => r.original.id === project.id);
                      if (!row) return null;
                      return (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && 'selected'}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                ))
              ) : table.getRowModel().rows?.length ? (
                // Normal view
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No projects found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Selection info */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{' '}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter new project name..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newProjectName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
};

