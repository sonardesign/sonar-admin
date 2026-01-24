import React from 'react'
import { Page } from '../components/Page'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { UsersSettingsPanel } from './Settings'
import { GoogleCalendarSettingsPanel } from './GoogleCalendarSync'

export const AdminSettings: React.FC = () => {
  return (
    <Page title="Admin Settings" subtitle="Manage users and integrations">
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="google-calendar">Google Calendar</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersSettingsPanel />
        </TabsContent>
        <TabsContent value="google-calendar">
          <GoogleCalendarSettingsPanel />
        </TabsContent>
      </Tabs>
    </Page>
  )
}

