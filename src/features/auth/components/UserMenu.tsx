import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar'
import { useAuth } from '../AuthContext'
import { User, Settings, LogOut } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface UserMenuProps {
  onOpenSavedArticles?: () => void
  onOpenHistory?: () => void
}

export const UserMenu: React.FC<UserMenuProps> = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profileFullName, setProfileFullName] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    if (!user?.id) {
      setProfileFullName(null)
      return
    }

    const loadProfileName = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (error) {
        if (error.code !== 'PGRST116') {
          console.warn('Failed to load profile name', error)
        }
        if (isMounted) {
          setProfileFullName(null)
        }
        return
      }

      if (isMounted) {
        setProfileFullName(data.full_name)
      }
    }

    loadProfileName()

    return () => {
      isMounted = false
    }
  }, [user?.id])

  if (!user) return null

  const displayName =
    profileFullName?.trim() ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'User'
  const initials = displayName.trim().charAt(0).toUpperCase() || 'U'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-white/80 p-[3px] shadow-lg ring-1 ring-slate-200/70 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:ring-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-sky-400/20 via-transparent to-indigo-500/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <Avatar className="relative h-full w-full rounded-full border border-white/60 shadow-inner">
            <AvatarImage
              src={user.user_metadata?.avatar_url}
              alt={displayName}
              className="rounded-full object-cover"
            />
            <AvatarFallback className="rounded-full bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-600 text-white text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="pointer-events-none absolute inset-[-0.15rem] rounded-full border border-white/40" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-64 overflow-hidden rounded-[1.6rem] border border-white/40 bg-white/85 p-0 shadow-[0_12px_32px_-18px_rgba(15,23,42,0.25)] backdrop-blur-xl"
        align="end"
      >
        <DropdownMenuLabel className="relative overflow-hidden p-4 pb-5 text-slate-700">
          <div className="absolute inset-0 bg-gradient-to-br from-[#e7edf7] via-[#e2e8f3] to-[#dde3ef]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.7),transparent_65%)]" />
          <div className="relative flex items-center gap-3.5 text-slate-700">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/40 shadow-sm shadow-slate-500/10 backdrop-blur">
              <Avatar className="h-9 w-9 rounded-full border border-white/60 shadow-inner shadow-slate-500/10">
                <AvatarImage
                  src={user.user_metadata?.avatar_url}
                  alt={displayName}
                  className="rounded-full object-cover"
                />
                <AvatarFallback className="rounded-full bg-gradient-to-br from-[#4a5b72] via-[#506b85] to-[#57839b] text-xs font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500/80">Signed in as</span>
              <span className="truncate text-[15px] font-semibold leading-tight text-slate-700">{displayName}</span>
              <span className="truncate text-[11.5px] text-slate-500">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>

        <div className="space-y-1 bg-white/85 px-3 pb-2.5 pt-2.5">
          <DropdownMenuItem
            onClick={() => navigate('/profile')}
            className="group mx-1 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 focus:bg-slate-50 focus:text-slate-900"
          >
            <User className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500 group-focus:text-slate-500" />
            <span className="truncate">Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => navigate('/preferences')}
            className="group mx-1 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 focus:bg-slate-50 focus:text-slate-900"
          >
            <Settings className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500 group-focus:text-slate-500" />
            <span className="truncate">Preferences</span>
          </DropdownMenuItem>
        </div>

        <div className="border-t border-white/70 bg-white/90 px-3 pb-2.5 pt-2">
          <DropdownMenuItem
            onClick={async () => {
              console.log('Sign out button clicked')
              await signOut()
            }}
            className="group mx-1 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-rose-500 transition-all hover:bg-rose-50 focus:bg-rose-50 focus:text-rose-600"
          >
            <LogOut className="h-4 w-4 transition-colors group-hover:text-rose-500 group-focus:text-rose-500" />
            <span className="truncate">Sign Out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
