import React, { useMemo, useState } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, Edit2, Plus } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { Page } from '../components/Page';
import { useProjectsData } from '../hooks/useProjectsData';
import { useLastPage, usePersistentState } from '../hooks/usePersistentState';
import { Client } from '../types';
import { toast } from 'sonner';

export const Clients: React.FC = () => {
  const { saveLastPage } = useLastPage();
  const { clients, createClient, updateClient, loading } = useProjectsData();

  React.useEffect(() => {
    saveLastPage('/clients');
  }, [saveLastPage]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});

  const [statusFilter, setStatusFilter] = usePersistentState('clients_statusFilter', 'all');
  const [groupBy, setGroupBy] = usePersistentState<'none' | 'status' | 'last_edited'>('clients_groupBy', 'none');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createClientName, setCreateClientName] = useState('');

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editClientName, setEditClientName] = useState('');
  const [editClientActive, setEditClientActive] = useState(true);

  const handleCreateClient = async () => {
    if (!createClientName.trim()) {
      toast.error('Client name is required');
      return;
    }

    try {
      const newClient = await createClient(createClientName.trim());
      if (newClient) {
        toast.success(`Client "${createClientName}" created successfully`);
        setCreateDialogOpen(false);
        setCreateClientName('');
      }
    } catch (error) {
      toast.error('Failed to create client');
    }
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setEditClientName(client.name);
    setEditClientActive(client.is_active);
    setEditDialogOpen(true);
  };

  const handleEditClient = async () => {
    if (!editingClient || !editClientName.trim()) {
      toast.error('Client name is required');
      return;
    }

    try {
      await updateClient(editingClient.id, {
        name: editClientName.trim(),
        is_active: editClientActive,
      });
      toast.success('Client updated');
      setEditDialogOpen(false);
      setEditingClient(null);
      setEditClientName('');
    } catch (error) {
      toast.error('Failed to update client');
    }
  };

  const columns: ColumnDef<Client>[] = useMemo(
    () => [
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
      {
        accessorKey: 'client_code',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2"
          >
            ID
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const code = row.getValue('client_code') as string | undefined;
          return (
            <div className="font-mono text-sm">
              {code || <span className="text-muted-foreground">-</span>}
            </div>
          );
        },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2"
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const client = row.original;
          return <div className="font-medium">{client.name}</div>;
        },
      },
      {
        accessorKey: 'is_active',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2"
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const isActive = row.getValue('is_active') as boolean;
          return (
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'active' : 'inactive'}
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          const isActive = row.getValue(id) as boolean;
          const status = isActive ? 'active' : 'inactive';
          return value.includes(status);
        },
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2"
          >
            Created
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const date = row.getValue('created_at') as string;
          return <div className="text-sm">{new Date(date).toLocaleDateString()}</div>;
        },
      },
      {
        accessorKey: 'updated_at',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2"
          >
            Last Edited
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const date = row.getValue('updated_at') as string;
          return <div className="text-sm">{new Date(date).toLocaleDateString()}</div>;
        },
      },
      {
        id: 'edit',
        header: 'Edit',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditDialog(row.original)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        ),
        enableSorting: false,
      },
    ],
    []
  );

  const table = useReactTable({
    data: clients,
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
    autoResetAll: false,
  });

  const uniqueStatuses = useMemo(
    () => Array.from(new Set(clients.map((client) => (client.is_active ? 'active' : 'inactive')))),
    [clients]
  );

  const groupedClients = useMemo(() => {
    if (groupBy === 'none') return null;

    let filtered = [...clients];
    columnFilters.forEach(filter => {
      if (filter.id === 'name' && filter.value) {
        const searchValue = (filter.value as string).toLowerCase();
        filtered = filtered.filter(c => c.name.toLowerCase().includes(searchValue));
      } else if (filter.id === 'is_active' && Array.isArray(filter.value) && filter.value.length > 0) {
        filtered = filtered.filter(c => filter.value.includes(c.is_active ? 'active' : 'inactive'));
      }
    });

    if (sorting.length > 0) {
      const sortConfig = sorting[0];
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.id === 'name') {
          aValue = a.name;
          bValue = b.name;
        } else if (sortConfig.id === 'is_active') {
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
        } else if (sortConfig.id === 'updated_at') {
          aValue = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          bValue = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        } else if (sortConfig.id === 'created_at') {
          aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
          bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
        }

        if (aValue < bValue) return sortConfig.desc ? 1 : -1;
        if (aValue > bValue) return sortConfig.desc ? -1 : 1;
        return 0;
      });
    }

    const groups: Record<string, Client[]> = {};
    filtered.forEach(client => {
      let key = '';
      if (groupBy === 'status') {
        key = client.is_active ? 'active' : 'inactive';
      } else if (groupBy === 'last_edited') {
        key = client.updated_at ? new Date(client.updated_at).toLocaleDateString() : 'Unknown';
      }
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(client);
    });

    return groups;
  }, [groupBy, columnFilters, clients, sorting]);

  if (loading) {
    return <Page loading={true} loadingText="Loading clients..."><div /></Page>;
  }

  return (
    <Page>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Clients</h1>
            <p className="text-muted-foreground mt-1">
              Manage your client list and status
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Client
          </Button>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <Input
            placeholder="Filter by name..."
            value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('name')?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />

          <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Grouping</SelectItem>
              <SelectItem value="status">Group by Status</SelectItem>
              <SelectItem value="last_edited">Group by Last Edited</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              table.getColumn('is_active')?.setFilterValue(value === 'all' ? '' : [value]);
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

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {groupedClients ? (
                Object.entries(groupedClients).map(([groupKey, groupClients]) => (
                  <React.Fragment key={groupKey}>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={columns.length} className="font-semibold">
                        {groupKey} ({groupClients.length})
                      </TableCell>
                    </TableRow>
                    {groupClients.map((client) => {
                      const row = table.getFilteredRowModel().rows.find(r => r.original.id === client.id);
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
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No clients found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{' '}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
        </div>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client name and status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editClientName">Client Name *</Label>
              <Input
                id="editClientName"
                value={editClientName}
                onChange={(e) => setEditClientName(e.target.value)}
                placeholder="Enter client name..."
              />
            </div>
            <div>
              <Label htmlFor="editClientStatus">Status</Label>
              <Select
                value={editClientActive ? 'active' : 'inactive'}
                onValueChange={(value) => setEditClientActive(value === 'active')}
              >
                <SelectTrigger id="editClientStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditClient} disabled={!editClientName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
            <DialogDescription>
              Add a new client to your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="createClientName">Client Name *</Label>
              <Input
                id="createClientName"
                value={createClientName}
                onChange={(e) => setCreateClientName(e.target.value)}
                placeholder="Enter client name..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateClient} disabled={!createClientName.trim()}>
              Create Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
};

