import React, { useCallback, useEffect, useMemo, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  MarkerType,
  Handle,
  Position,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from 'reactflow'
import dagre from 'dagre'
import 'reactflow/dist/style.css'
import { Page } from '../components/Page'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { cn } from '../lib/utils'

export interface Column {
  name: string
  type: string
  is_nullable: boolean
  is_pk: boolean
}

export interface Table {
  schema: string
  name: string
  columns: Column[]
}

export interface Relation {
  source_table: string
  source_column: string
  target_table: string
  target_column: string
  constraint_name: string
}

export interface SchemaGraph {
  tables: Table[]
  relations: Relation[]
}

interface SchemaNodeData {
  table: Table
  isMatch: boolean
  isSelected: boolean
}

const NODE_WIDTH = 260
const NODE_BASE_HEIGHT = 70
const NODE_ROW_HEIGHT = 24

const SchemaTableNode: React.FC<NodeProps<SchemaNodeData>> = ({ data }) => {
  const { table, isMatch, isSelected } = data
  return (
    <div
      className={cn(
        'rounded-md border bg-card text-card-foreground shadow-sm',
        isMatch && 'border-primary',
        isSelected && 'ring-2 ring-primary/60'
      )}
      style={{ width: NODE_WIDTH }}
    >
      <div className="border-b px-3 py-2 text-sm font-semibold">
        {table.schema}.{table.name}
      </div>
      <div className="px-3 py-2 text-xs space-y-1">
        {table.columns.map((column) => (
          <div
            key={column.name}
            className="relative flex items-center justify-between gap-2"
          >
            <Handle
              type="target"
              id={`target-${column.name}`}
              position={Position.Left}
              className="!h-2 !w-2 !bg-slate-400"
            />
            <div className="truncate pl-2">
              <span className={cn(column.is_pk && 'font-semibold text-primary')}>{column.name}</span>
              {column.is_pk && <span className="ml-1 text-[10px] text-primary">PK</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{column.type}</span>
              <Handle
                type="source"
                id={`source-${column.name}`}
                position={Position.Right}
                className="!h-2 !w-2 !bg-slate-400"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const nodeTypes = {
  schemaTable: SchemaTableNode,
}

const layoutGraph = (nodes: Node<SchemaNodeData>[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 140 })

  nodes.forEach((node) => {
    const height = NODE_BASE_HEIGHT + node.data.table.columns.length * NODE_ROW_HEIGHT
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height })
  })

  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target))
  dagre.layout(dagreGraph)

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    const height = NODE_BASE_HEIGHT + node.data.table.columns.length * NODE_ROW_HEIGHT
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - height / 2,
      },
    }
  })
}

export const SchemaGraphPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState<SchemaNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    const loadSchema = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/schema-graph')
        if (!response.ok) {
          const fallbackText = await response.text().catch(() => '')
          const message = fallbackText || `Request failed (${response.status})`
          throw new Error(message)
        }
        const data: SchemaGraph = await response.json()

        const tableNodes: Node<SchemaNodeData>[] = data.tables.map((table) => ({
          id: `${table.schema}.${table.name}`,
          type: 'schemaTable',
          position: { x: 0, y: 0 },
          data: {
            table,
            isMatch: false,
            isSelected: false,
          },
        }))

        const nodeIdByTable = new Map<string, string>()
        tableNodes.forEach((node) => {
          nodeIdByTable.set(node.data.table.name, node.id)
        })

        const relationEdges: Edge[] = data.relations
          .map((relation) => {
            const sourceId = nodeIdByTable.get(relation.source_table)
            const targetId = nodeIdByTable.get(relation.target_table)
            if (!sourceId || !targetId) {
              return null
            }
            return {
              id: relation.constraint_name,
              source: sourceId,
              target: targetId,
              sourceHandle: `source-${relation.source_column}`,
              targetHandle: `target-${relation.target_column}`,
              label: `${relation.source_column} → ${relation.target_column}`,
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed },
            } as Edge
          })
          .filter(Boolean) as Edge[]

        const layoutedNodes = layoutGraph(tableNodes, relationEdges)
        setNodes(layoutedNodes)
        setEdges(relationEdges)
      } catch (error) {
        console.error('Schema graph error:', error)
        const message = error instanceof Error ? error.message : 'Failed to load schema'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    loadSchema()
  }, [setEdges, setNodes])

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, type: 'smoothstep' }, eds))
  }, [setEdges])

  const displayNodes = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()
    return nodes.map((node) => {
      const table = node.data.table
      const matchesTable = `${table.schema}.${table.name}`.toLowerCase().includes(searchTerm)
      const matchesColumn = table.columns.some((column) =>
        column.name.toLowerCase().includes(searchTerm)
      )
      const isMatch = Boolean(searchTerm) && (matchesTable || matchesColumn)
      const isSelected = selectedNodeId === node.id
      return {
        ...node,
        data: {
          ...node.data,
          isMatch,
          isSelected,
        },
      }
    })
  }, [nodes, search, selectedNodeId])

  const displayEdges = useMemo(() => {
    return edges.map((edge) => {
      const isConnected =
        selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId)
      return {
        ...edge,
        animated: Boolean(isConnected),
        style: {
          ...edge.style,
          stroke: isConnected ? '#2563eb' : '#64748b',
          strokeWidth: isConnected ? 2 : 1.5,
        },
        labelStyle: {
          fill: isConnected ? '#1d4ed8' : '#475569',
          fontSize: 11,
          fontWeight: 500,
        },
        labelBgStyle: {
          fill: '#ffffff',
        },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 6,
      }
    })
  }, [edges, selectedNodeId])

  return (
    <Page title="DB Schema" subtitle="Visualize tables and foreign key relations">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Schema Graph</CardTitle>
          <div className="max-w-sm">
            <Input
              placeholder="Search table or column..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading schema...</div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : (
            <div className="h-[720px] w-full rounded-md border">
              <ReactFlow
                nodes={displayNodes}
                edges={displayEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                onPaneClick={() => setSelectedNodeId(null)}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={{
                  type: 'smoothstep',
                  markerEnd: { type: MarkerType.ArrowClosed },
                }}
                fitView
              >
                <MiniMap />
                <Controls />
                <Background gap={16} />
              </ReactFlow>
            </div>
          )}
        </CardContent>
      </Card>
    </Page>
  )
}

