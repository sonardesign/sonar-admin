import React, { useCallback } from 'react'
import ReactFlow, { addEdge, Background, Controls, MiniMap, useEdgesState, useNodesState, type Connection, type Edge } from 'reactflow'
import 'reactflow/dist/style.css'
import { Page } from '../components/Page'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

const initialNodes = [
  { id: 'leads', position: { x: 0, y: 0 }, data: { label: 'Leads' } },
  { id: 'contacts', position: { x: 250, y: 120 }, data: { label: 'Contacts' } },
  { id: 'projects', position: { x: 0, y: 240 }, data: { label: 'Projects' } },
  { id: 'time_entries', position: { x: 250, y: 360 }, data: { label: 'Time Entries' } },
]

const initialEdges: Edge[] = [
  { id: 'leads-contacts', source: 'leads', target: 'contacts', label: 'has many' },
  { id: 'projects-time_entries', source: 'projects', target: 'time_entries', label: 'has many' },
]

export const AdminBuilder: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, type: 'smoothstep' }, eds))
  }, [setEdges])

  return (
    <Page title="Admin Builder" subtitle="Configure and build admin tools">
      <Card>
        <CardHeader>
          <CardTitle>Data Model Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Map your datasets as nodes and connect them to describe relationships.
          </p>
          <div className="h-[600px] w-full rounded-md border">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
            >
              <MiniMap />
              <Controls />
              <Background gap={16} />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>
    </Page>
  )
}

