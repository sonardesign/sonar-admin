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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { MoreHorizontal, Trash2, Edit2, ArrowUpDown } from 'lucide-react';
import { useProjectsData } from '../hooks/useProjectsData';
import { Project } from '../types';
import { Page } from '../components/Page';
import { toast } from 'sonner';

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const {
    clients,
    projects,
    updateProject,
    deleteProject,
    loading,
  } = useProjectsData();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingProject, setRenamingProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState('');

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
        await deleteProject(project.id);
        toast.success(`Project "${project.name}" deleted`);
      } catch (error) {
        toast.error('Failed to delete project');
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
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
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
              onClick={() => navigate(`/projects/${project.id}`)}
              className="font-medium hover:underline text-left"
            >
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
      // Manager column
      {
        accessorKey: 'created_by',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2"
            >
              Manager
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          return <div className="text-muted-foreground">-</div>;
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
    [navigate, clients]
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

  if (loading) {
    return <Page loading={true} loadingText="Loading projects..." />;
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
        <div className="flex items-center gap-4">
          {/* Name filter */}
          <Input
            placeholder="Filter by name..."
            value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('name')?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />

          {/* Status filter */}
          <Select
            value={(table.getColumn('status')?.getFilterValue() as string) ?? 'all'}
            onValueChange={(value) =>
              table.getColumn('status')?.setFilterValue(value === 'all' ? '' : [value])
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
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

          {/* Client filter */}
          <Select
            value={(table.getColumn('client_name')?.getFilterValue() as string) ?? 'all'}
            onValueChange={(value) =>
              table.getColumn('client_name')?.setFilterValue(value === 'all' ? '' : [value])
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Client" />
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
              {table.getRowModel().rows?.length ? (
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

