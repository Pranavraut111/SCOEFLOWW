import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Student } from '@/types/student';
import { downloadCSV } from '@/utils/studentUtils';
import { Search, Download, Users, Trash2, Eye, Filter, Edit } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const StudentList = () => {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterSemester, setFilterSemester] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/v1/students/');
      if (response.ok) {
        const studentData = await response.json();
        setStudents(studentData);
      } else {
        console.error('Failed to fetch students:', response.statusText);
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = 
        student.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.roll_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase());
        

      const matchesBranch = filterBranch === 'all' || student.department === filterBranch;
      const matchesYear = filterYear === 'all' || student.state === filterYear;
      const matchesSemester = filterSemester === 'all' || student.current_semester?.toString() === filterSemester;

      return matchesSearch && matchesBranch && matchesYear && matchesSemester;
    });
  }, [students, searchTerm, filterBranch, filterYear, filterSemester]);

  const handleUpdateStudent = async (updatedStudent: Student) => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/v1/students/${updatedStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: updatedStudent.first_name,
          middle_name: updatedStudent.middle_name,
          last_name: updatedStudent.last_name,
          email: updatedStudent.email,
          phone: updatedStudent.phone,
          date_of_birth: updatedStudent.date_of_birth,
          gender: updatedStudent.gender,
          address: updatedStudent.address,
          state: updatedStudent.state,
          department: updatedStudent.department,
          category: updatedStudent.category,
          admission_number: updatedStudent.admission_number,
          roll_number: updatedStudent.roll_number,
          institutional_email: updatedStudent.institutional_email,
          mother_name: updatedStudent.mother_name,
        }),
      });
      
      if (response.ok) {
        await loadStudents();
        setEditingStudent(null);
        toast({
          title: "Student updated",
          description: "Student record has been updated successfully",
        });
      } else {
        toast({
          title: "Update failed",
          description: "Failed to update student record",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update student record",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/v1/students/${studentId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadStudents();
        toast({
          title: "Student deleted",
          description: "Student record has been removed successfully",
        });
      } else {
        toast({
          title: "Delete failed",
          description: "Failed to delete student record",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete student record",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    if (filteredStudents.length === 0) {
      toast({
        title: "No data to export",
        description: "Please add some students first or adjust your filters",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create CSV content from filtered students
      const headers = [
        'First Name',
        'Middle Name', 
        'Last Name',
        'Roll Number',
        'Email',
        'Phone',
        'Date of Birth',
        'Gender',
        'Address',
        'Year',
        'Department',
        'Category',
        'Admission Number',
        'Institutional Email',
        'Mother Name'
      ];

      const csvContent = [
        headers.join(','),
        ...filteredStudents.map(student => [
          `"${student.first_name || ''}"`,
          `"${student.middle_name || ''}"`,
          `"${student.last_name || ''}"`,
          `"${student.roll_number || ''}"`,
          `"${student.email || ''}"`,
          `"${student.phone || ''}"`,
          `"${student.date_of_birth || ''}"`,
          `"${student.gender || ''}"`,
          `"${student.address || ''}"`,
          `"${student.state || ''}"`,
          `"${student.department || ''}"`,
          `"${student.category || ''}"`,
          `"${student.admission_number || ''}"`,
          `"${student.institutional_email || ''}"`,
          `"${student.mother_name || ''}"`
        ].join(','))
      ].join('\n');

      // Create and download the CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Generate filename with filter info
      let filename = 'students';
      if (searchTerm) filename += `_search-${searchTerm}`;
      if (filterBranch !== 'all') filename += `_${filterBranch}`;
      if (filterYear !== 'all') filename += `_${filterYear}`;
      filename += '.csv';
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export successful",
        description: `${filteredStudents.length} filtered students exported to CSV`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export students data",
        variant: "destructive",
      });
    }
  };

  const uniqueBranches = [...new Set(students.map(s => s.department))].filter(branch => branch && branch.trim() !== '');
  const uniqueYears = [...new Set(students.map(s => s.state))].filter(year => year && year.trim() !== '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Student Management
          </CardTitle>
          <CardDescription>
            View, search, and manage all registered students ({students.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1">
              <Label htmlFor="search">Search Students</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, roll number, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <div>
                <Label>Branch</Label>
                <Select value={filterBranch} onValueChange={setFilterBranch}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {uniqueBranches.map(branch => (
                      <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {uniqueYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Semester</Label>
                <Select value={filterSemester} onValueChange={setFilterSemester}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sems</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <SelectItem key={sem} value={sem.toString()}>Sem {sem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Export Button */}
            <div className="self-end">
              <Button 
                onClick={handleExport}
                variant="outline"
                className="hover:bg-success/10 hover:text-success hover:border-success"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredStudents.length} of {students.length} students
            </p>
            {(searchTerm || filterBranch !== 'all' || filterYear !== 'all' || filterSemester !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterBranch('all');
                  setFilterYear('all');
                  setFilterSemester('all');
                }}
              >
                <Filter className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Student Table */}
      {filteredStudents.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {students.length === 0 ? 'No students registered yet' : 'No students match your filters'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {students.length === 0 
                ? 'Add your first student to get started with student management.'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Photo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Admission</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} className="hover:bg-muted/50">
                      <TableCell>
                        {student.photo ? (
                          <img 
                            src={student.photo} 
                            alt={student.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-border"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary font-medium text-sm">
                              {(student.first_name + ' ' + student.last_name).split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{student.first_name} {student.last_name}</div>
                          {student.middle_name && (
                            <div className="text-sm text-muted-foreground">{student.middle_name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{student.roll_number}</TableCell>
                      <TableCell>
                        <div className="max-w-[150px] truncate" title={student.department}>
                          {student.department}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {student.state}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs font-mono">
                          Sem {student.current_semester || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-medium">
                          {student.admission_year || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate text-primary" title={student.email}>
                          {student.email}
                        </div>
                        {(student as any).institutional_email && (
                          <div className="text-xs text-muted-foreground truncate" title={(student as any).institutional_email}>
                            {(student as any).institutional_email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{student.phone}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {student.category?.toUpperCase() || 'General'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedStudent(student)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                            onClick={() => setEditingStudent(student)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Student</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {student.first_name} {student.last_name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteStudent(student.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Student Details
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4 mb-6">
                {selectedStudent.photo ? (
                  <img 
                    src={selectedStudent.photo} 
                    alt={selectedStudent.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-medium text-lg">
                      {(selectedStudent.first_name + ' ' + selectedStudent.last_name).split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-bold">{selectedStudent.first_name} {selectedStudent.middle_name} {selectedStudent.last_name}</h3>
                  <p className="text-muted-foreground">{selectedStudent.roll_number}</p>
                  <p className="text-primary">{selectedStudent.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <p className="font-medium">{selectedStudent.phone}</p>
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <p className="font-medium">{new Date(selectedStudent.date_of_birth).toLocaleDateString()}</p>
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <p className="font-medium">{selectedStudent.gender}</p>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <p className="font-medium">{selectedStudent.state}</p>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <p className="font-medium">{selectedStudent.department}</p>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <p className="font-medium">{selectedStudent.category?.toUpperCase() || 'General'}</p>
                </div>
                <div className="space-y-2">
                  <Label>Mother's Name</Label>
                  <p className="font-medium">{selectedStudent.mother_name}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <p className="font-medium">{selectedStudent.address}</p>
              </div>

              <div className="space-y-2">
                <Label>Institutional Email</Label>
                <p className="font-medium text-primary">{selectedStudent.institutional_email}</p>
              </div>

              <div className="space-y-2">
                <Label>Created</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedStudent.created_at && !isNaN(new Date(selectedStudent.created_at).getTime()) 
                    ? new Date(selectedStudent.created_at).toLocaleString()
                    : 'Date not available'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Student Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-primary" />
                  Edit Student Details
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setEditingStudent(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <EditStudentForm 
                student={editingStudent} 
                onSave={handleUpdateStudent}
                onCancel={() => setEditingStudent(null)}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Edit Student Form Component
const EditStudentForm = ({ student, onSave, onCancel }: {
  student: Student;
  onSave: (student: Student) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    first_name: student.first_name || '',
    middle_name: student.middle_name || '',
    last_name: student.last_name || '',
    email: student.email || '',
    phone: student.phone || '',
    date_of_birth: student.date_of_birth || '',
    gender: student.gender || 'male',
    address: student.address || '',
    state: student.state || '',
    department: student.department || '',
    category: student.category || 'General',
    admission_number: student.admission_number || '',
    roll_number: student.roll_number || '',
    institutional_email: student.institutional_email || '',
    mother_name: student.mother_name || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...student,
      ...formData,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => handleChange('first_name', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="middle_name">Middle Name</Label>
          <Input
            id="middle_name"
            value={formData.middle_name}
            onChange={(e) => handleChange('middle_name', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => handleChange('last_name', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="date_of_birth">Date of Birth</Label>
          <Input
            id="date_of_birth"
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => handleChange('date_of_birth', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="gender">Gender</Label>
          <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(e) => handleChange('department', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="state">Year</Label>
          <Select value={formData.state} onValueChange={(value) => handleChange('state', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1st Year">1st Year</SelectItem>
              <SelectItem value="2nd Year">2nd Year</SelectItem>
              <SelectItem value="3rd Year">3rd Year</SelectItem>
              <SelectItem value="4th Year">4th Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="General">General</SelectItem>
              <SelectItem value="OBC">OBC</SelectItem>
              <SelectItem value="SC">SC</SelectItem>
              <SelectItem value="ST">ST</SelectItem>
              <SelectItem value="EWS">EWS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="admission_number">Admission Number</Label>
          <Input
            id="admission_number"
            value={formData.admission_number}
            onChange={(e) => handleChange('admission_number', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="roll_number">Roll Number</Label>
          <Input
            id="roll_number"
            value={formData.roll_number}
            onChange={(e) => handleChange('roll_number', e.target.value)}
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
        />
      </div>
      
      <div>
        <Label htmlFor="institutional_email">Institutional Email</Label>
        <Input
          id="institutional_email"
          type="email"
          value={formData.institutional_email}
          onChange={(e) => handleChange('institutional_email', e.target.value)}
        />
      </div>
      
      <div>
        <Label htmlFor="mother_name">Mother's Name</Label>
        <Input
          id="mother_name"
          value={formData.mother_name}
          onChange={(e) => handleChange('mother_name', e.target.value)}
          required
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          Save Changes
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default StudentList;