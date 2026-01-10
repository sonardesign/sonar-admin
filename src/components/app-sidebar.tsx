import { Star, Clock, TrendingUp, BarChart3, FolderOpen, ListTodo, Users, TrendingUp as Funnel, User, Phone, FileText, Settings, ChevronUp, LogOut, Sun, Moon, Monitor } from 'lucide-react'
import { useLocation, Link } from 'react-router-dom'
import snrLogo from '../assets/snr-logo.svg'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from './ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import { useAuth } from '../hooks/useAuth'
import { useSupabaseAppState } from '../hooks/useSupabaseAppState'
import { usePermissions } from '../hooks/usePermissions'
import { useTheme } from '../hooks/useTheme'

// Menu items for each group
const favouritesItems = [
  {
    title: 'Favourites',
    url: '#',
    icon: Star,
  },
]

const trackingItems = [
  {
    title: 'Timetable',
    url: '/timetable',
    icon: Clock,
  },
  {
    title: 'Forecast',
    url: '/workload',
    icon: TrendingUp,
  },
  {
    title: 'Reports',
    url: '/reports',
    icon: BarChart3,
  },
]

const generalItems = [
  {
    title: 'Projects',
    url: '/projects',
    icon: FolderOpen,
  },
  {
    title: 'Tasks',
    url: '/tasks',
    icon: ListTodo,
  },
  {
    title: 'Clients',
    url: '/clients',
    icon: Users,
  },
]

const crmItems = [
  {
    title: 'Funnel',
    url: '/funnel',
    icon: Funnel,
  },
  {
    title: 'Contacts',
    url: '/contacts',
    icon: Phone,
  },
  {
    title: 'Reports',
    url: '/crm-reports',
    icon: FileText,
  },
]

export function AppSidebar() {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { users } = useSupabaseAppState()
  const { userRole } = usePermissions()
  const { theme, setTheme } = useTheme()

  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/'
    return location.pathname.startsWith(url)
  }

  // Get user profile
  const userProfile = users.find(u => u.id === user?.id)
  const profileName = userProfile?.full_name || user?.user_metadata?.full_name || user?.email || 'User'

  // Generate initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={snrLogo} alt="SNR Logo" className="h-8 w-auto" />
        </div>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>
        {/* Favourites Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Favourites</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {favouritesItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tracking Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Tracking</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {trackingItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* General Group */}
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {generalItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* CRM Group */}
        <SidebarGroup>
          <SidebarGroupLabel>CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {crmItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/settings')}>
                  <Link to="/settings">
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      {/* User Account Footer */}
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between p-2 h-auto hover:bg-muted/50"
            >
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt={profileName} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(profileName)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{profileName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
                </div>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            side="top" 
            className="w-56 mb-2"
            sideOffset={8}
          >
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="h-4 w-4 mr-2" />
              Light
              {theme === 'light' && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="h-4 w-4 mr-2" />
              Dark
              {theme === 'dark' && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Monitor className="h-4 w-4 mr-2" />
              System
              {theme === 'system' && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

