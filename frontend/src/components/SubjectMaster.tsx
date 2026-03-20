import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Plus, List, Save, Trash2, Edit, Eye, X, Settings, Minus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

// Types for Subject Master
interface SubjectComponent {
  id?: number;
  component_type: 'ESE' | 'IA' | 'TW' | 'PR' | 'OR' | 'TH';
  is_enabled: boolean;
  out_of_marks: number;
  passing_marks: number;
  resolution?: string;
}

interface Subject {
  id?: number;
  year: string;
  scheme: string;
  department: 'Computer Science Engineering' | 'Information Technology' | 'Electronics and Communication Engineering' | 'Electrical Engineering' | 'Mechanical Engineering' | 'Civil Engineering';
  semester: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII';
  subject_code: string;
  subject_name: string;
  credits: number;
  overall_passing_criteria: number;
  components: SubjectComponent[];
}

interface SubjectCatalog {
  id: number;
  department: string;
  semester: string;
  subject_code: string;
  subject_name: string;
  default_credits: number;
}

const SubjectMaster = () => {
  const { toast } = useToast();
  
  // Form state
  const [formData, setFormData] = useState<Partial<Subject>>({
    year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1).toString().slice(-2),
    scheme: '2019',
    department: 'Computer Science Engineering',
    semester: 'I',
    subject_code: '',
    subject_name: '',
    credits: 3,
    overall_passing_criteria: 40,
    components: []
  });
  
  // Catalog and subjects state
  const [subjectCatalog, setSubjectCatalog] = useState<SubjectCatalog[]>([]);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [viewingSubject, setViewingSubject] = useState<Subject | null>(null);
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [catalogSubjects, setCatalogSubjects] = useState<SubjectCatalog[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'list'>('form');

  // Load subject catalog when semester/department changes
  useEffect(() => {
    if (formData.department && formData.semester) {
      fetchSubjectCatalog(formData.department, formData.semester);
    }
  }, [formData.department, formData.semester]);

  // Load subjects list
  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjectCatalog = async (department: string, semester: string) => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/v1/subjects/catalog?department=${encodeURIComponent(department)}&semester=${semester}`);
      if (response.ok) {
        const data = await response.json();
        setSubjectCatalog(data);
      }
    } catch (error) {
      console.error('Error fetching subject catalog:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/v1/subjects/');
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const handleFormChange = (field: keyof Subject, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-populate from catalog if subject is selected
    if (field === 'subject_name' && !isCustomSubject) {
      const catalogSubject = subjectCatalog.find(s => s.subject_name === value);
      if (catalogSubject) {
        setFormData(prev => ({
          ...prev,
          subject_code: catalogSubject.subject_code,
          credits: catalogSubject.default_credits,
          components: getDefaultComponents(catalogSubject.subject_name)
        }));
      }
    }
  };

  const getDefaultComponents = (subjectName: string): SubjectComponent[] => {
    // Determine component type based on subject name
    if (subjectName.toLowerCase().includes('lab') || subjectName.toLowerCase().includes('practical')) {
      return [
        { component_type: 'PR', is_enabled: true, out_of_marks: 50, passing_marks: 20, resolution: 'Practical Assessment' },
        { component_type: 'OR', is_enabled: true, out_of_marks: 25, passing_marks: 10, resolution: 'Viva Voce' },
        { component_type: 'TW', is_enabled: true, out_of_marks: 25, passing_marks: 10, resolution: 'Term Work' }
      ];
    } else if (subjectName.toLowerCase().includes('project')) {
      return [
        { component_type: 'PR', is_enabled: true, out_of_marks: 100, passing_marks: 40, resolution: 'Project Evaluation' },
        { component_type: 'OR', is_enabled: true, out_of_marks: 50, passing_marks: 20, resolution: 'Project Viva' }
      ];
    } else {
      // Theory subject
      return [
        { component_type: 'ESE', is_enabled: true, out_of_marks: 80, passing_marks: 32 },
        { component_type: 'IA', is_enabled: true, out_of_marks: 20, passing_marks: 8 }
      ];
    }
  };

  const handleComponentChange = (index: number, field: keyof SubjectComponent, value: any) => {
    const updatedComponents = [...(formData.components || [])];
    updatedComponents[index] = { ...updatedComponents[index], [field]: value };
    setFormData(prev => ({ ...prev, components: updatedComponents }));
  };

  const addComponent = () => {
    const newComponent: SubjectComponent = {
      component_type: 'ESE',
      is_enabled: true,
      out_of_marks: 100,
      passing_marks: 40
    };
    setFormData(prev => ({
      ...prev,
      components: [...(prev.components || []), newComponent]
    }));
  };

  const removeComponent = (index: number) => {
    const updatedComponents = formData.components?.filter((_, i) => i !== index) || [];
    setFormData(prev => ({ ...prev, components: updatedComponents }));
  };

  const handleSubmit = async () => {
    try {
      // Validation for required fields
      if (!formData.subject_code || !formData.subject_name) {
        toast({
          title: "Validation Error",
          description: "Subject code and subject name are required fields",
          variant: "destructive",
        });
        return;
      }

      if (isCustomSubject && (!formData.subject_code.trim() || !formData.subject_name.trim())) {
        toast({
          title: "Validation Error",
          description: "Please enter both subject code and subject name for custom subjects",
          variant: "destructive",
        });
        return;
      }

      const method = editingSubject ? 'PUT' : 'POST';
      const url = editingSubject ? `/api/v1/subjects/${editingSubject.id}` : '/api/v1/subjects/';
      
      console.log('Submitting data:', formData);
      console.log('Edit mode:', !!editingSubject);
      console.log('Is custom subject:', isCustomSubject);
      
      // Ensure all required fields are present
      const submitData = {
        ...formData,
        scheme: formData.scheme || '2019',
        components: formData.components || []
      };
      
      console.log('Final submit data:', submitData);
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });
      
      if (response.ok) {
        toast({
          title: editingSubject ? "Subject updated" : "Subject created",
          description: `${formData.subject_name} has been ${editingSubject ? 'updated' : 'created'} successfully`,
        });
        resetForm();
        fetchSubjects();
        setActiveTab('list');
      } else {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(JSON.stringify(errorData.detail) || 'Failed to save subject');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save subject. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1).toString().slice(-2),
      scheme: '2019',
      department: 'Computer Science Engineering',
      semester: 'I',
      subject_code: '',
      subject_name: '',
      credits: 3,
      overall_passing_criteria: 40,
      components: []
    });
    setIsCustomSubject(false);
    setEditingSubject(null);
  };

  const editSubject = (subject: Subject) => {
    console.log('Editing subject:', subject);
    setFormData({
      ...subject,
      components: subject.components || []
    });
    setEditingSubject(subject);
    setIsCustomSubject(true); // Set to custom since we're editing an existing subject
    setActiveTab('form');
  };

  const viewSubject = (subject: Subject) => {
    setViewingSubject(subject);
  };

  const deleteSubject = async (subjectId: number) => {
    if (!confirm("Are you sure you want to delete this subject? This action cannot be undone.")) {
      return;
    }
    
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/v1/subjects/${subjectId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast({
          title: "Subject deleted",
          description: "Subject has been deleted successfully",
        });
        fetchSubjects();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete subject');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete subject",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Subject Master
          </CardTitle>
          <CardDescription>
            Comprehensive subject management with marks breakdown for engineering subjects
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex space-x-2">
        <Button 
          variant={activeTab === 'form' ? 'default' : 'outline'}
          onClick={() => setActiveTab('form')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {editingSubject ? 'Edit Subject' : 'Add Subject'}
        </Button>
        <Button 
          variant={activeTab === 'list' ? 'default' : 'outline'}
          onClick={() => setActiveTab('list')}
          className="flex items-center gap-2"
        >
          <List className="h-4 w-4" />
          Subject List
        </Button>
      </div>

      {/* Subject Form */}
      {activeTab === 'form' && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {editingSubject ? 'Edit Subject' : 'Subject Master Form'}
            </CardTitle>
            <CardDescription>
              Configure subject details and marks breakdown components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Academic Year</Label>
                <Input
                  id="year"
                  value={formData.year}
                  onChange={(e) => handleFormChange('year', e.target.value)}
                  placeholder="e.g., 2024-25"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scheme">Scheme</Label>
                <Select 
                  value={formData.scheme} 
                  onValueChange={(value) => handleFormChange('scheme', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Scheme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2019">2019</SelectItem>
                    <SelectItem value="2015">2015</SelectItem>
                    <SelectItem value="2012">2012</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(value) => handleFormChange('department', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Computer Science Engineering">Computer Science Engineering</SelectItem>
                    <SelectItem value="Information Technology">Information Technology</SelectItem>
                    <SelectItem value="Electronics and Communication Engineering">Electronics and Communication Engineering</SelectItem>
                    <SelectItem value="Electrical Engineering">Electrical Engineering</SelectItem>
                    <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                    <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="semester">Semester</Label>
                <Select 
                  value={formData.semester} 
                  onValueChange={(value) => handleFormChange('semester', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'].map((sem) => (
                      <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subject Selection */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="custom-subject"
                  checked={isCustomSubject}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    setIsCustomSubject(isChecked);
                    // Clear subject fields when switching modes
                    if (isChecked) {
                      setFormData(prev => ({
                        ...prev,
                        subject_code: '',
                        subject_name: '',
                        components: []
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        subject_code: '',
                        subject_name: '',
                        components: []
                      }));
                    }
                  }}
                />
                <Label htmlFor="custom-subject" className="cursor-pointer">Custom Subject (not from catalog)</Label>
              </div>
              
              {!isCustomSubject ? (
                <div className="space-y-2">
                  <Label htmlFor="subject-name">Subject Name</Label>
                  <Select 
                    value={formData.subject_name} 
                    onValueChange={(value) => handleFormChange('subject_name', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Subject from Catalog" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectCatalog.map((subject) => (
                        <SelectItem key={subject.id} value={subject.subject_name}>
                          {subject.subject_code} - {subject.subject_name}
                        </SelectItem>
                      ))}
                      <SelectItem value="Other">Other (Custom Entry)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Custom Subject Entry</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Enter details for a subject that is not available in the catalog
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject-code" className="text-sm font-medium">
                        Subject Code <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="subject-code"
                        value={formData.subject_code || ''}
                        onChange={(e) => handleFormChange('subject_code', e.target.value.toUpperCase())}
                        placeholder="e.g., CEC501, IT301"
                        className="font-mono"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the official subject code (will be converted to uppercase)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custom-subject-name" className="text-sm font-medium">
                        Subject Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="custom-subject-name"
                        value={formData.subject_name || ''}
                        onChange={(e) => handleFormChange('subject_name', e.target.value)}
                        placeholder="e.g., Advanced Database Systems"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the full subject name
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="credits">Credits</Label>
                  <Input
                    id="credits"
                    type="number"
                    value={formData.credits || 3}
                    onChange={(e) => handleFormChange('credits', parseInt(e.target.value))}
                    min="1"
                    max="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passing-criteria">Overall Passing Criteria (%)</Label>
                  <Input
                    id="passing-criteria"
                    type="number"
                    value={formData.overall_passing_criteria || 40}
                    onChange={(e) => handleFormChange('overall_passing_criteria', parseFloat(e.target.value))}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Marks Breakdown Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Marks Breakdown Components</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure assessment components (ESE, IA, TW, PR, etc.)
                  </p>
                </div>
                <Button onClick={addComponent} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Component
                </Button>
              </div>
              
              {formData.components && formData.components.length > 0 ? (
                <div className="space-y-3">
                  {formData.components.map((component, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="space-y-2">
                          <Label>Component Type</Label>
                          <Select 
                            value={component.component_type} 
                            onValueChange={(value) => handleComponentChange(index, 'component_type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ESE">ESE (End Semester Exam)</SelectItem>
                              <SelectItem value="IA">IA (Internal Assessment)</SelectItem>
                              <SelectItem value="TW">TW (Term Work)</SelectItem>
                              <SelectItem value="PR">PR (Practical)</SelectItem>
                              <SelectItem value="OR">OR (Oral/Viva)</SelectItem>
                              <SelectItem value="TH">TH (Theory)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Out of Marks</Label>
                          <Input
                            type="number"
                            value={component.out_of_marks}
                            onChange={(e) => handleComponentChange(index, 'out_of_marks', parseInt(e.target.value))}
                            min="1"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Passing Marks</Label>
                          <Input
                            type="number"
                            value={component.passing_marks}
                            onChange={(e) => handleComponentChange(index, 'passing_marks', parseInt(e.target.value))}
                            min="0"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Resolution (Optional)</Label>
                          <Input
                            value={component.resolution || ''}
                            onChange={(e) => handleComponentChange(index, 'resolution', e.target.value)}
                            placeholder="e.g., Practical Assessment"
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              checked={component.is_enabled}
                              onCheckedChange={(checked) => handleComponentChange(index, 'is_enabled', checked === true)}
                            />
                            <Label className="text-sm">Enabled</Label>
                          </div>
                          <Button 
                            onClick={() => removeComponent(index)}
                            variant="outline" 
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No components added yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add assessment components like ESE, IA, TW, PR
                  </p>
                  <Button onClick={addComponent} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Component
                  </Button>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={resetForm}>
                Reset Form
              </Button>
              <Button onClick={handleSubmit} className="bg-gradient-primary hover:bg-primary-hover">
                <Save className="h-4 w-4 mr-2" />
                {editingSubject ? 'Update Subject' : 'Create Subject'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject List */}
      {activeTab === 'list' && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Subject List
            </CardTitle>
            <CardDescription>
              Manage existing subjects grouped by semester
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No subjects created yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first subject using the form
                </p>
                <Button onClick={() => setActiveTab('form')} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subject
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Group subjects by department */}
                {[
                  'Computer Science Engineering',
                  'Information Technology', 
                  'Electronics and Communication Engineering',
                  'Electrical Engineering',
                  'Mechanical Engineering',
                  'Civil Engineering'
                ].map((department) => {
                  const deptSubjects = subjects.filter(s => s.department === department);
                  if (deptSubjects.length === 0) return null;
                  
                  return (
                    <div key={department} className="border rounded-lg p-6 bg-gradient-to-r from-slate-50 to-gray-50">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-xl font-bold text-gray-800">{department}</h2>
                          <p className="text-sm text-muted-foreground">{deptSubjects.length} subjects across all semesters</p>
                        </div>
                        <Badge variant="secondary" className="text-lg px-3 py-1">
                          {deptSubjects.length}
                        </Badge>
                      </div>
                      
                      {/* Group by semester within department */}
                      <div className="space-y-6">
                        {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'].map((semester) => {
                          const semesterSubjects = deptSubjects.filter(s => s.semester === semester);
                          if (semesterSubjects.length === 0) return null;
                          
                          return (
                            <div key={semester} className="bg-white rounded-lg p-4 shadow-sm">
                              <div className="flex items-center gap-3 mb-4">
                                <Badge variant="outline" className="font-semibold">
                                  Semester {semester}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {semesterSubjects.length} subject{semesterSubjects.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b bg-gray-50">
                                      <th className="text-left p-3 font-semibold">Subject Code</th>
                                      <th className="text-left p-3 font-semibold">Subject Name</th>
                                      <th className="text-center p-3 font-semibold">Credits</th>
                                      <th className="text-center p-3 font-semibold">Pass %</th>
                                      <th className="text-center p-3 font-semibold">Components</th>
                                      <th className="text-center p-3 font-semibold">Year</th>
                                      <th className="text-center p-3 font-semibold">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {semesterSubjects.map((subject) => (
                                      <tr key={subject.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="p-3 font-mono text-blue-600">{subject.subject_code}</td>
                                        <td className="p-3 font-medium">{subject.subject_name}</td>
                                        <td className="p-3 text-center">
                                          <Badge variant="outline">{subject.credits}</Badge>
                                        </td>
                                        <td className="p-3 text-center">
                                          <Badge variant="outline">{subject.overall_passing_criteria}%</Badge>
                                        </td>
                                        <td className="p-3 text-center">
                                          <Badge variant="secondary">{subject.components?.length || 0}</Badge>
                                        </td>
                                        <td className="p-3 text-center text-muted-foreground">{subject.year}</td>
                                        <td className="p-3">
                                          <div className="flex justify-center gap-2">
                                            <Button 
                                              onClick={() => viewSubject(subject)}
                                              variant="outline" 
                                              size="sm"
                                              className="text-blue-600 hover:bg-blue-50"
                                            >
                                              View
                                            </Button>
                                            <Button 
                                              onClick={() => editSubject(subject)}
                                              variant="outline" 
                                              size="sm"
                                              className="text-green-600 hover:bg-green-50"
                                            >
                                              Edit
                                            </Button>
                                            <Button 
                                              onClick={() => deleteSubject(subject.id!)}
                                              variant="outline" 
                                              size="sm"
                                              className="text-red-600 hover:bg-red-50"
                                            >
                                              Delete
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subject View Modal */}
      {viewingSubject && (
        <Dialog open={!!viewingSubject} onOpenChange={() => setViewingSubject(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Subject Details
              </DialogTitle>
              <DialogDescription>
                Complete information about {viewingSubject.subject_name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Subject Code</Label>
                    <p className="font-mono text-blue-600 font-semibold">{viewingSubject.subject_code}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Subject Name</Label>
                    <p className="font-semibold">{viewingSubject.subject_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Department</Label>
                    <p>{viewingSubject.department}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Semester</Label>
                    <Badge variant="outline">Semester {viewingSubject.semester}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Academic Year</Label>
                    <p>{viewingSubject.year}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Scheme</Label>
                    <p>{viewingSubject.scheme}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Credits</Label>
                    <Badge variant="secondary">{viewingSubject.credits}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Passing Criteria</Label>
                    <Badge variant="outline">{viewingSubject.overall_passing_criteria}%</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Assessment Components */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Assessment Components</CardTitle>
                  <CardDescription>
                    Marks breakdown and evaluation criteria
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {viewingSubject.components && viewingSubject.components.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-3 font-semibold">Component</th>
                            <th className="text-center p-3 font-semibold">Status</th>
                            <th className="text-center p-3 font-semibold">Total Marks</th>
                            <th className="text-center p-3 font-semibold">Passing Marks</th>
                            <th className="text-center p-3 font-semibold">Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingSubject.components.map((component, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="p-3">
                                <Badge variant="outline" className="font-semibold">
                                  {component.component_type}
                                </Badge>
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant={component.is_enabled ? "default" : "secondary"}>
                                  {component.is_enabled ? "Enabled" : "Disabled"}
                                </Badge>
                              </td>
                              <td className="p-3 text-center font-semibold">{component.out_of_marks}</td>
                              <td className="p-3 text-center">{component.passing_marks}</td>
                              <td className="p-3 text-center">
                                {((component.passing_marks / component.out_of_marks) * 100).toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 bg-gray-100 font-semibold">
                            <td className="p-3">Total</td>
                            <td className="p-3 text-center">-</td>
                            <td className="p-3 text-center">
                              {viewingSubject.components.reduce((sum, comp) => sum + comp.out_of_marks, 0)}
                            </td>
                            <td className="p-3 text-center">
                              {viewingSubject.components.reduce((sum, comp) => sum + comp.passing_marks, 0)}
                            </td>
                            <td className="p-3 text-center">
                              {viewingSubject.overall_passing_criteria}%
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Settings className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No assessment components configured</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  onClick={() => {
                    setViewingSubject(null);
                    editSubject(viewingSubject);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Subject
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setViewingSubject(null)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SubjectMaster;