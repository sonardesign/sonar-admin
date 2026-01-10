import React, { useState, useEffect } from 'react'
import { Plus, Mail, Phone, Building2, Globe } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Contact } from '../types'
import { toast } from 'sonner'
import { Page } from '../components/Page'

export const Contacts: React.FC = () => {
  const { user } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    organization_name: '',
    url: ''
  })

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setContacts(data || [])
    } catch (error) {
      console.error('Error loading contacts:', error)
      toast.error('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    if (!user?.id) {
      toast.error('You must be logged in to create a contact')
      return
    }

    try {
      setIsSaving(true)
      
      const { error } = await supabase
        .from('contacts')
        .insert({
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          organization_name: formData.organization_name || null,
          url: formData.url || null,
          created_by: user.id
        })

      if (error) throw error

      toast.success('Contact created successfully')
      setIsDrawerOpen(false)
      setFormData({
        name: '',
        phone: '',
        email: '',
        organization_name: '',
        url: ''
      })
      await loadContacts()
    } catch (error) {
      console.error('Error creating contact:', error)
      toast.error('Failed to create contact')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Page loading={loading} loadingText="Loading contacts...">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
            <p className="text-muted-foreground">
              Manage your business contacts
            </p>
          </div>
          
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add New Contact
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Add New Contact</SheetTitle>
                <SheetDescription>
                  Enter the contact information below
                </SheetDescription>
              </SheetHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 234 567 890"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@example.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization_name">Organization Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="organization_name"
                      name="organization_name"
                      value={formData.organization_name}
                      onChange={handleInputChange}
                      placeholder="Acme Inc."
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">URL</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="url"
                      name="url"
                      type="url"
                      value={formData.url}
                      onChange={handleInputChange}
                      placeholder="https://example.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={isSaving} className="flex-1">
                    {isSaving ? 'Creating...' : 'Create Contact'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDrawerOpen(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </SheetContent>
          </Sheet>
        </div>

        {/* Contacts Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Contacts</CardTitle>
            <CardDescription>
              A list of all your contacts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No contacts found</h3>
                <p className="text-muted-foreground">
                  Get started by adding your first contact
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-sm">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-sm">Phone</th>
                      <th className="text-left py-3 px-4 font-medium text-sm">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-sm">Organization</th>
                      <th className="text-left py-3 px-4 font-medium text-sm">URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <tr key={contact.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 text-sm font-medium">
                          {contact.name}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {contact.phone || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {contact.email || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {contact.organization_name || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {contact.url ? (
                            <a 
                              href={contact.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {contact.url}
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}

