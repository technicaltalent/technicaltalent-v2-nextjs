'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle, Loader2 } from 'lucide-react'

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

interface ManufacturerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  manufacturer?: Manufacturer | null
  onSuccess: () => void
}

export function ManufacturerModal({ 
  open, 
  onOpenChange, 
  manufacturer, 
  onSuccess 
}: ManufacturerModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    website: '',
    logoUrl: '',
    isActive: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!manufacturer

  // Reset form when modal opens/closes or manufacturer changes
  useEffect(() => {
    if (open) {
      if (manufacturer) {
        setFormData({
          name: manufacturer.name,
          category: manufacturer.category || '',
          description: manufacturer.description || '',
          website: manufacturer.website || '',
          logoUrl: manufacturer.logoUrl || '',
          isActive: manufacturer.isActive
        })
      } else {
        setFormData({
          name: '',
          category: '',
          description: '',
          website: '',
          logoUrl: '',
          isActive: true
        })
      }
      setError('')
    }
  }, [open, manufacturer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = isEditing 
        ? `/api/admin/manufacturers/${manufacturer.id}`
        : '/api/admin/manufacturers'
      
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          category: formData.category.trim() || null,
          description: formData.description.trim() || null,
          website: formData.website.trim() || null,
          logoUrl: formData.logoUrl.trim() || null,
          isActive: formData.isActive
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save manufacturer')
      }

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Manufacturer' : 'Add New Manufacturer'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the manufacturer information below.'
              : 'Add a new equipment manufacturer to the system.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">Name *</label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Digico, Midas, Allen & Heath"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium">Category</label>
            <select
              id="category"
              value={formData.category}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('category', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select category...</option>
              <option value="audio">Audio</option>
              <option value="lighting">Lighting</option>
              <option value="video">Video</option>
              <option value="stage">Stage</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of the manufacturer..."
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="website" className="text-sm font-medium">Website</label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('website', e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="logoUrl" className="text-sm font-medium">Logo URL</label>
            <Input
              id="logoUrl"
              type="url"
              value={formData.logoUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('logoUrl', e.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('isActive', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm font-medium">Active</label>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'} Manufacturer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 