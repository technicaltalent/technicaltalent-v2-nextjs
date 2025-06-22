import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // DEVELOPMENT BYPASS: Allow access without authentication for testing
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Always get session, but only enforce it in production
  const session = await getServerSession(authOptions)
  
  if (!isDevelopment) {
    // Check if user is authenticated and has admin privileges
    if (!session?.user) {
      redirect('/auth/signin?callbackUrl=/admin')
    }

    // For now, we'll check if user has admin role
    // You may need to adjust this based on your role system
    const isAdmin = session.user.role === 'admin' || session.user.email === 'admin@technicaltalent.com.au'

    if (!isAdmin) {
      redirect('/?error=unauthorized')
    }
  }

  // For development, create a mock user that matches NextAuth user type
  const mockUser = {
    name: 'Dev Admin',
    email: 'dev@admin.com',
    image: null
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader user={isDevelopment ? mockUser : (session?.user || mockUser)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
    </div>
  )
} 