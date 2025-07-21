'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import type { Project } from '@/lib/types';

interface GenerateInvoiceDialogProps {
  onInvoiceGenerated: () => void;
}

export function GenerateInvoiceDialog({ onInvoiceGenerated }: GenerateInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    projectName: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open]);

  const fetchProjects = async () => {
    try {
      const response = await apiClient.getProjects();
      const projects = response.data || response;
      setProjects(Array.isArray(projects) ? projects.filter((p: Project) => p.status === 'active') : []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.projectName || !formData.startDate || !formData.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    try {
      setIsGenerating(true);
      
      await apiClient.generateInvoice({
        projectName: formData.projectName,
        startDate: formData.startDate,
        endDate: formData.endDate
      });
      
      toast.success('Invoice generated successfully');
      setOpen(false);
      setFormData({ projectName: '', startDate: '', endDate: '' });
      onInvoiceGenerated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate invoice');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Generate Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accenture-500" />
            Generate Invoice
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="projectName">Project *</Label>
            <Select value={formData.projectName} onValueChange={(value) => setFormData(prev => ({ ...prev, projectName: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.projectName}>
                    {project.projectName} ({project.clientName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                min={formData.startDate}
                required
              />
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="font-medium text-blue-900 mb-1">Invoice Generation Logic:</p>
            <ul className="text-blue-800 space-y-1">
              <li>• Calculates based on approved seat allocations in the period</li>
              <li>• Segments billing by headcount changes</li>
              <li>• Excludes weekends and holidays from working days</li>
              <li>• Uses project's charged seat percentage and seat rate</li>
            </ul>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate Invoice'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}