'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Building2, 
  Search, 
  Filter, 
  MoreHorizontal,
  Plus,
  Globe,
  Calendar,
  Users,
  ExternalLink,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react'
import { ManufacturerModal } from '@/components/admin/ManufacturerModal'

interface Manufacturer {
  id: string
  name: string
  category: string | null
  description: string | null
  website: string | null
  logoUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ManufacturerStats {
  totalCount: number
  activeCount: number
  withWebsiteCount: number
  withLogoCount: number
  categoryCounts: { [key: string]: number }
}

function ManufacturerTableRow({ 
  manufacturer, 
  onEdit, 
  onDelete 
}: { 
  manufacturer: Manufacturer
  onEdit: (manufacturer: Manufacturer) => void
  onDelete: (manufacturer: Manufacturer) => void
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
            {manufacturer.logoUrl ? (
              <img 
                src={manufacturer.logoUrl} 
                alt={manufacturer.name}
                className="h-10 w-10 object-contain"
              />
            ) : (
              <Building2 className="h-6 w-6 text-gray-400" />
            )}
          </div>
          <div>
            <div className="font-medium">{manufacturer.name}</div>
            {manufacturer.description && (
              <div className="text-sm text-gray-500 max-w-md truncate">
                {manufacturer.description}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        {manufacturer.category ? (
          <Badge variant="outline" className="capitalize">
            {manufacturer.category}
          </Badge>
        ) : (
          <span className="text-gray-400 text-sm">No category</span>
        )}
      </TableCell>
      <TableCell>
        {manufacturer.website ? (
          <a 
            href={manufacturer.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
          >
            <Globe className="h-4 w-4" />
            <span className="text-sm">Visit Website</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-gray-400 text-sm">No website</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={manufacturer.isActive ? 'default' : 'secondary'}>
          {manufacturer.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-1 text-sm text-gray-500">
          <Calendar className="h-3 w-3" />
          <span>{new Date(manufacturer.createdAt).toLocaleDateString()}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-gray-500">
          {new Date(manufacturer.updatedAt).toLocaleDateString()}
        </div>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(manufacturer)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(manufacturer)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

function ManufacturerStatsCards({ stats }: { stats: ManufacturerStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Manufacturers</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCount}</div>
          <p className="text-xs text-muted-foreground">All equipment manufacturers</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeCount}</div>
          <p className="text-xs text-muted-foreground">Currently active</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">With Website</CardTitle>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.withWebsiteCount}</div>
          <p className="text-xs text-muted-foreground">Have website links</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Categories</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {Object.entries(stats.categoryCounts).length > 0 ? (
              Object.entries(stats.categoryCounts).map(([category, count]) => (
                <div key={category} className="flex justify-between text-sm">
                  <span className="capitalize">{category || 'Uncategorized'}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No categories set</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ManufacturersPage() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [stats, setStats] = useState<ManufacturerStats>({
    totalCount: 0,
    activeCount: 0,
    withWebsiteCount: 0,
    withLogoCount: 0,
    categoryCounts: {}
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingManufacturer, setEditingManufacturer] = useState<Manufacturer | null>(null)

  const fetchManufacturers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/manufacturers')
      const data = await response.json()
      
      console.log('🔍 Full API response:', data)
      console.log('🔍 First manufacturer from API:', data.data?.manufacturers?.[0])
      
      if (response.ok) {
        const manufacturerList = data.data.manufacturers
        setManufacturers(manufacturerList)
        
        // Calculate stats
        const totalCount = manufacturerList.length
        const activeCount = manufacturerList.filter((m: Manufacturer) => m.isActive).length
        const withWebsiteCount = manufacturerList.filter((m: Manufacturer) => m.website).length
        const withLogoCount = manufacturerList.filter((m: Manufacturer) => m.logoUrl).length
        
        // Calculate category counts
        const categoryCounts: { [key: string]: number } = {}
        manufacturerList.forEach((m: Manufacturer) => {
          if (m.category) {
            categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1
          }
        })
        
        setStats({
          totalCount,
          activeCount,
          withWebsiteCount,
          withLogoCount,
          categoryCounts
        })
      }
    } catch (error) {
      console.error('Error fetching manufacturers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchManufacturers()
  }, [])

  const handleAddManufacturer = () => {
    setEditingManufacturer(null)
    setModalOpen(true)
  }

  const handleEditManufacturer = (manufacturer: Manufacturer) => {
    setEditingManufacturer(manufacturer)
    setModalOpen(true)
  }

  const handleDeleteManufacturer = async (manufacturer: Manufacturer) => {
    if (!confirm(`Are you sure you want to delete "${manufacturer.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/manufacturers/${manufacturer.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchManufacturers() // Refresh the list
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete manufacturer')
      }
    } catch (error) {
      console.error('Error deleting manufacturer:', error)
      alert('Failed to delete manufacturer')
    }
  }

  const handleModalSuccess = () => {
    fetchManufacturers() // Refresh the list
  }

  const filteredManufacturers = manufacturers.filter(manufacturer =>
    manufacturer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (manufacturer.description && manufacturer.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manufacturers Management</h1>
          <p className="text-muted-foreground">
            Manage equipment manufacturers and brands
          </p>
        </div>
        <Button onClick={handleAddManufacturer}>
          <Plus className="mr-2 h-4 w-4" />
          Add Manufacturer
        </Button>
      </div>

      <ManufacturerStatsCards stats={stats} />

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Manufacturers Directory</CardTitle>
          <CardDescription>
            Equipment and brand manufacturers used by talent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search manufacturers..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>

          {/* Manufacturers Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredManufacturers.map((manufacturer) => (
                  <ManufacturerTableRow 
                    key={manufacturer.id} 
                    manufacturer={manufacturer}
                    onEdit={handleEditManufacturer}
                    onDelete={handleDeleteManufacturer}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredManufacturers.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No manufacturers found</h3>
              <p className="mt-1 text-gray-500">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first manufacturer.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ManufacturerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        manufacturer={editingManufacturer}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
} 