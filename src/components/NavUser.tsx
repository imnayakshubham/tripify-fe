import { ChevronsUpDown, Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import type { Identity, Role } from '@/lib/identity'

/** The stub identity has no display name, so the local-part stands in for one. */
function localPart(email: string): string {
  return email.split('@')[0] || email
}

function initials(email: string): string {
  const name = localPart(email)
  const parts = name.split(/[._-]+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)
  return letters.toUpperCase()
}

export function NavUser({
  identity,
  onIdentityChange,
}: {
  identity: Identity
  onIdentityChange: (next: Identity) => void
}) {
  const { isMobile } = useSidebar()
  // `theme` (not `resolvedTheme`) is hydrated synchronously from localStorage,
  // so the checked row is right on the first paint.
  const { theme, setTheme } = useTheme()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg text-xs">
                  {initials(identity.email)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">
                  {localPart(identity.email)}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {identity.role}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
              {identity.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Role
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={identity.role}
              onValueChange={(role) =>
                onIdentityChange({ ...identity, role: role as Role })
              }
            >
              <DropdownMenuRadioItem value="user">user</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="admin">admin</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Theme
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light">
                <Sun />
                Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon />
                Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <Monitor />
                System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
