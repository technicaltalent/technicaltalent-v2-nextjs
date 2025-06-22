'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Edit2, Trash2, Settings } from 'lucide-react'

interface Skill {
  id: string
  name: string
  wordpressId: number
}

interface SkillMapping {
  id: string
  skillWordpressId: number
  manufacturerCategory: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  skill: Skill | null
}

interface ApiResponse {
  mappings: SkillMapping[]
  parentSkills: Skill[]
  manufacturerCategories: string[]
}

export default function SkillMappingsPage() {
  const { toast } = useToast()
  const [mappings, setMappings] = useState<SkillMapping[]>([])
  const [parentSkills, setParentSkills] = useState<Skill[]>([])
  const [manufacturerCategories, setManufacturerCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMapping, setEditingMapping] = useState<SkillMapping | null>(null)

  // Form state
  const [selectedSkillId, setSelectedSkillId] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  const fetchMappings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/skill-manufacturer-mappings')
      if (!response.ok) throw new Error('Failed to fetch mappings')
      
      const data: ApiResponse = await response.json()
      setMappings(data.mappings)
      setParentSkills(data.parentSkills)
      setManufacturerCategories(data.manufacturerCategories)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load skill mappings',
        variant: 'destructive'
      })
      console.error('Error fetching mappings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMappings()
  }, [])

  const handleCreateMapping = async () => {
    try {
      const selectedSkill = parentSkills.find(skill => skill.id === selectedSkillId)
      if (!selectedSkill || !selectedCategory) {
        toast({
          title: 'Error',
          description: 'Please select both a skill and category',
          variant: 'destructive'
        })
        return
      }

      const response = await fetch('/api/admin/skill-manufacturer-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillWordpressId: selectedSkill.wordpressId,
          manufacturerCategory: selectedCategory
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create mapping')
      }

      toast({
        title: 'Success',
        description: 'Skill mapping created successfully'
      })
      setIsDialogOpen(false)
      setSelectedSkillId('')
      setSelectedCategory('')
      fetchMappings()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
      console.error('Error creating mapping:', error)
    }
  }

  const handleUpdateMapping = async () => {
    if (!editingMapping) return

    try {
      const response = await fetch(`/api/admin/skill-manufacturer-mappings/${editingMapping.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manufacturerCategory: selectedCategory,
          isActive: true
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update mapping')
      }

      toast({
        title: 'Success',
        description: 'Skill mapping updated successfully'
      })
      setIsDialogOpen(false)
      setEditingMapping(null)
      setSelectedCategory('')
      fetchMappings()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
      console.error('Error updating mapping:', error)
    }
  }

  const handleDeleteMapping = async (mapping: SkillMapping) => {
    if (!confirm(`Are you sure you want to delete the mapping for ${mapping.skill?.name}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/skill-manufacturer-mappings/${mapping.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete mapping')
      }

      toast({
        title: 'Success',
        description: 'Skill mapping deleted successfully'
      })
      fetchMappings()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
      console.error('Error deleting mapping:', error)
    }
  }

  const openCreateDialog = () => {
    setEditingMapping(null)
    setSelectedSkillId('')
    setSelectedCategory('')
    setIsDialogOpen(true)
  }

  const openEditDialog = (mapping: SkillMapping) => {
    setEditingMapping(mapping)
    setSelectedCategory(mapping.manufacturerCategory)
    setIsDialogOpen(true)
  }

  // Get unmapped skills for the create dropdown
  const mappedSkillIds = new Set(mappings.map(m => m.skillWordpressId))
  const unmappedSkills = parentSkills.filter(skill => !mappedSkillIds.has(skill.wordpressId))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Skill-Manufacturer Mappings</h1>
          <p className="text-muted-foreground">
            Configure which manufacturer categories appear for each skill during skills selection
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Mapping
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Current Mappings
          </CardTitle>
          <CardDescription>
            These mappings determine which equipment manufacturers are shown when users select skills
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading mappings...</div>
            </div>
          ) : mappings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No skill mappings configured yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead>WordPress ID</TableHead>
                  <TableHead>Manufacturer Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell className="font-medium">
                      {mapping.skill?.name || 'Unknown Skill'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{mapping.skillWordpressId}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>{mapping.manufacturerCategory}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={mapping.isActive ? 'default' : 'secondary'}>
                        {mapping.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(mapping.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(mapping)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMapping(mapping)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMapping ? 'Edit Skill Mapping' : 'Create Skill Mapping'}
            </DialogTitle>
            <DialogDescription>
              {editingMapping 
                ? `Update the manufacturer category for ${editingMapping.skill?.name}`
                : 'Map a skill to a manufacturer category'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!editingMapping && (
              <div className="space-y-2">
                <Label htmlFor="skill">Skill</Label>
                <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a skill..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unmappedSkills.map((skill) => (
                      <SelectItem key={skill.id} value={skill.id}>
                        {skill.name} (WP ID: {skill.wordpressId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="category">Manufacturer Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category..." />
                </SelectTrigger>
                <SelectContent>
                  {manufacturerCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={editingMapping ? handleUpdateMapping : handleCreateMapping}
              disabled={!selectedCategory || (!editingMapping && !selectedSkillId)}
            >
              {editingMapping ? 'Update Mapping' : 'Create Mapping'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 