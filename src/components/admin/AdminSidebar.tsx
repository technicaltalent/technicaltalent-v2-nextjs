'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { 
  Users, 
  Briefcase, 
  Settings, 
  BarChart3, 
  UserCheck, 
  Building2,
  Home,
  Link2
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Jobs & Roles', href: '/admin/jobs', icon: Briefcase },
  { name: 'Skills', href: '/admin/skills', icon: UserCheck },
  { name: 'Manufacturers', href: '/admin/manufacturers', icon: Building2 },
  { name: 'Skill Mappings', href: '/admin/skill-mappings', icon: Link2 },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col w-64 bg-white shadow-lg">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 bg-blue-600">
        <div className="flex items-center">
          <Image 
            src="/images/admin-logo.svg" 
            alt="Technical Talent Admin" 
            width={156} 
            height={42} 
            className="h-[42px] w-auto"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                ${isActive 
                  ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Technical Talent Admin v2.0
        </p>
      </div>
    </div>
  )
} 