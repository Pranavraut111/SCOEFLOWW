import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Search,
  Filter,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";

interface ExamEvent {
  id: number;
  name: string;
  department: string;
  semester: number;
}

interface StudentEnrollment {
  id: number;
  student_id: number;
  enrollment_status: string;
  enrollment_date: string;
  is_backlog_student: boolean;
  exempted_subjects?: string;
  special_requirements?: string;
  notes?: string;
  student?: {
    id: number;
    first_name: string;
    middle_name: string;
    last_name: string;
    roll_number: string;
    email: string;
    department: string;
    state: string;
  };
}

interface Student {
  id: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  roll_number: string;
  email: string;
  department: string;
  state: string;
}

interface StudentEnrollmentManagerProps {
  examEvent: ExamEvent;
}

const StudentEnrollmentManager = ({ examEvent }: StudentEnrollmentManagerProps) => {
  const { toast } = useToast();
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [eligibleStudents, setEligibleStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showBulkEnroll, setShowBulkEnroll] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);

  useEffect(() => {
    fetchEnrollments();
    fetchEligibleStudents();
  }, [examEvent.id]);

  const fetchEnrollments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/v1/exams/events/${examEvent.id}/enrollments/`);
      if (response.ok) {
        const data = await response.json();
        setEnrollments(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load enrollments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEligibleStudents = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/v1/students/?department=${examEvent.department}&semester=${examEvent.semester}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out already enrolled students
        const enrolledStudentIds = enrollments.map(e => e.student_id);
        const eligible = data.filter((student: Student) => !enrolledStudentIds.includes(student.id));
        setEligibleStudents(eligible);
      }
    } catch (error) {
      console.error('Failed to fetch eligible students:', error);
    }
  };

  const handleBulkEnrollAll = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/v1/exams/events/${examEvent.id}/enrollments/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exam_event_id: examEvent.id,
          department: examEvent.department,
          semester: examEvent.semester,
          enrolled_by: 'Admin'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        await fetchEnrollments();
        await fetchEligibleStudents();
        
        toast({
          title: "Bulk Enrollment Complete",
          description: `${result.enrolled_count} students enrolled successfully. ${result.skipped_count} already enrolled.`,
        });
      } else {
        throw new Error('Failed to bulk enroll students');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enroll students",
        variant: "destructive",
      });
    }
  };

  const handleBulkEnrollSelected = async () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select students to enroll",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/v1/exams/events/${examEvent.id}/enrollments/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exam_event_id: examEvent.id,
          student_ids: selectedStudents,
          enrolled_by: 'Admin'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        await fetchEnrollments();
        await fetchEligibleStudents();
        setSelectedStudents([]);
        setShowBulkEnroll(false);
        
        toast({
          title: "Students Enrolled",
          description: `${result.enrolled_count} students enrolled successfully`,
        });
      } else {
        throw new Error('Failed to enroll selected students');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enroll students",
        variant: "destructive",
      });
    }
  };

  const handleIndividualEnroll = async (studentId: number) => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/v1/exams/events/${examEvent.id}/enrollments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          enrolled_by: 'Admin'
        }),
      });

      if (response.ok) {
        await fetchEnrollments();
        await fetchEligibleStudents();
        toast({
          title: "Student Enrolled",
          description: "Student enrolled successfully",
        });
      } else {
        throw new Error('Failed to enroll student');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enroll student",
        variant: "destructive",
      });
    }
  };

  const handleUpdateEnrollment = async (enrollmentId: number, updates: any) => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/v1/exams/enrollments/${enrollmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await fetchEnrollments();
        toast({
          title: "Enrollment Updated",
          description: "Student enrollment updated successfully",
        });
      } else {
        throw new Error('Failed to update enrollment');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update enrollment",
        variant: "destructive",
      });
    }
  };

  const handleRemoveEnrollment = async (enrollmentId: number) => {
    if (!confirm('Are you sure you want to remove this student from the exam?')) return;

    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/v1/exams/enrollments/${enrollmentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchEnrollments();
        await fetchEligibleStudents();
        toast({
          title: "Student Removed",
          description: "Student removed from exam successfully",
        });
      } else {
        throw new Error('Failed to remove student');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove student",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enrolled':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'exempted':
        return 'bg-blue-100 text-blue-800';
      case 'disqualified':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredEnrollments = enrollments.filter(enrollment => {
    const student = enrollment.student;
    if (!student) return false;

    const matchesSearch = searchTerm === '' || 
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.roll_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || enrollment.enrollment_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Student Enrollment - {examEvent.name}
              </CardTitle>
              <CardDescription>
                Manage student enrollments for this exam event
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowBulkEnroll(!showBulkEnroll)}
                variant="outline"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Students
              </Button>
              <Button 
                onClick={() => setShowExcelImport(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import Excel
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Bulk Enrollment Panel */}
      {showBulkEnroll && (
        <Card>
          <CardHeader>
            <CardTitle>Add Students to Exam</CardTitle>
            <CardDescription>
              Select students to enroll in this exam event
            </CardDescription>
          </CardHeader>
          <CardContent>
            {eligibleStudents.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Eligible Students</h3>
                <p className="text-muted-foreground">
                  All eligible students are already enrolled in this exam
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedStudents.length === eligibleStudents.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStudents(eligibleStudents.map(s => s.id));
                        } else {
                          setSelectedStudents([]);
                        }
                      }}
                    />
                    <Label>Select All ({eligibleStudents.length} students)</Label>
                  </div>
                  <Button 
                    onClick={handleBulkEnrollSelected}
                    disabled={selectedStudents.length === 0}
                  >
                    Enroll Selected ({selectedStudents.length})
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {eligibleStudents.map((student) => (
                    <div key={student.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                      <Checkbox
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStudents(prev => [...prev, student.id]);
                          } else {
                            setSelectedStudents(prev => prev.filter(id => id !== student.id));
                          }
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {student.roll_number}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleIndividualEnroll(student.id)}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Excel Import Panel */}
      {showExcelImport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Eligible Students from Excel
            </CardTitle>
            <CardDescription>
              Upload an Excel file with eligible students for this exam
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExcelImportForm 
              examEvent={examEvent}
              onSuccess={() => {
                setShowExcelImport(false);
                fetchEnrollments();
                fetchEligibleStudents();
              }}
              onCancel={() => setShowExcelImport(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Enrolled Students */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Enrolled Students ({enrollments.length})</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="exempted">Exempted</SelectItem>
                  <SelectItem value="disqualified">Disqualified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : filteredEnrollments.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Students Enrolled</h3>
              <p className="text-muted-foreground mb-4">
                Start by enrolling eligible students for this exam
              </p>
              <Button onClick={handleBulkEnrollAll}>
                <Users className="mr-2 h-4 w-4" />
                Enroll All Eligible Students
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEnrollments.map((enrollment) => (
                <Card key={enrollment.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">
                            {enrollment.student?.first_name} {enrollment.student?.middle_name} {enrollment.student?.last_name}
                          </h4>
                          <Badge className={getStatusColor(enrollment.enrollment_status)}>
                            {enrollment.enrollment_status}
                          </Badge>
                          {enrollment.is_backlog_student && (
                            <Badge variant="outline">Backlog</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>Roll: {enrollment.student?.roll_number}</div>
                          <div>Email: {enrollment.student?.email}</div>
                          <div>Enrolled: {new Date(enrollment.enrollment_date).toLocaleDateString()}</div>
                          <div>Year: {enrollment.student?.state}</div>
                        </div>

                        {enrollment.special_requirements && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                            <strong>Special Requirements:</strong> {enrollment.special_requirements}
                          </div>
                        )}

                        {enrollment.notes && (
                          <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                            <strong>Notes:</strong> {enrollment.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Select
                          value={enrollment.enrollment_status}
                          onValueChange={(value) => handleUpdateEnrollment(enrollment.id, { enrollment_status: value })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="enrolled">Enrolled</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="exempted">Exempted</SelectItem>
                            <SelectItem value="disqualified">Disqualified</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Excel Import Form Component
interface ExcelImportFormProps {
  examEvent: ExamEvent;
  onSuccess: () => void;
  onCancel: () => void;
}

const ExcelImportForm = ({ examEvent, onSuccess, onCancel }: ExcelImportFormProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && 
          selectedFile.type !== 'application/vnd.ms-excel' &&
          !selectedFile.name.toLowerCase().endsWith('.csv')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file (.csv)",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      previewExcelData(selectedFile);
    }
  };

  const previewExcelData = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Parse CSV data
      const csvData = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= 3 && values[0]) { // Must have roll_number
          const row = {
            roll_number: values[0],
            first_name: values[1] || '',
            last_name: values[2] || '',
            current_semester: values[3] ? parseInt(values[3]) : null,
            department: values[4] || '',
            email: values[5] || '',
            isValid: false // Will be validated below
          };
          csvData.push(row);
        }
      }
      
      // Validate students against database
      const validatedData = await validateStudentsInDatabase(csvData);
      setPreviewData(validatedData);
      
    } catch (error) {
      console.error('Error previewing CSV data:', error);
      toast({
        title: "Preview Error",
        description: "Failed to preview CSV file. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const validateStudentsInDatabase = async (students: any[]) => {
    try {
      // Get all students from database for validation
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/v1/students/');
      if (!response.ok) {
        throw new Error('Failed to fetch students from database');
      }
      
      const allStudents = await response.json();
      
      // Create a map for quick lookup
      const studentMap = new Map();
      allStudents.forEach((student: any) => {
        studentMap.set(student.roll_number.toLowerCase(), {
          id: student.id,
          email: student.email,
          first_name: student.first_name,
          last_name: student.last_name,
          department: student.department
        });
      });
      
      // Validate each student in the CSV
      return students.map(student => {
        const dbStudent = studentMap.get(student.roll_number.toLowerCase());
        return {
          ...student,
          isValid: !!dbStudent,
          email: dbStudent?.email || student.email,
          dbId: dbStudent?.id,
          department: dbStudent?.department
        };
      });
      
    } catch (error) {
      console.error('Error validating students:', error);
      // Return students with validation failed
      return students.map(student => ({
        ...student,
        isValid: false
      }));
    }
  };

  const downloadTemplate = async () => {
    try {
      // Fetch demo students from API
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/v1/students/demo/template-data?department=${encodeURIComponent(examEvent.department)}&limit=5`);
      
      let demoStudents = [];
      if (response.ok) {
        demoStudents = await response.json();
      } else {
        // Fallback to hardcoded data
        demoStudents = [
          {
            roll_number: "SCOE101", first_name: "Aarav", middle_name: "Rajesh", last_name: "Sharma",
            email: "aarav.sharma@gmail.com", phone: "9876543210", department: examEvent.department, year: "1st Year"
          },
          {
            roll_number: "SCOE102", first_name: "Priya", middle_name: "Suresh", last_name: "Patel",
            email: "priya.patel@gmail.com", phone: "9876543211", department: examEvent.department, year: "1st Year"
          }
        ];
      }

      // Create simplified CSV template with essential columns
      let template = 'roll_number,first_name,last_name,current_semester,department\n';
      
      // Add empty rows for teachers to fill
      template += ',,,,\n'; // Empty row 1
      template += ',,,,\n'; // Empty row 2
      template += ',,,,\n'; // Empty row 3
      template += ',,,,\n'; // Empty row 4
      template += ',,,,\n'; // Empty row 5

      // Create CSV file with proper encoding
      const blob = new Blob(['\ufeff' + template], { 
        type: 'text/csv;charset=utf-8' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eligible_students_template_${examEvent.department}_sem${examEvent.semester}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Template Downloaded",
        description: "CSV template with realistic demo data has been downloaded. Modify the data as needed and upload the CSV file.",
      });
    } catch (error) {
      console.error('Error downloading template:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (!file || previewData.length === 0) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to upload",
        variant: "destructive",
      });
      return;
    }

    const validStudents = previewData.filter(student => student.isValid);
    const invalidStudents = previewData.filter(student => !student.isValid);

    if (validStudents.length === 0) {
      toast({
        title: "No Valid Students",
        description: "No valid students found in the file. Please check the roll numbers.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Enroll only valid students directly
      let successCount = 0;
      let errorCount = 0;

      for (const student of validStudents) {
        try {
          const enrollmentData = {
            exam_event_id: examEvent.id,
            student_id: student.dbId,
            enrollment_status: 'enrolled',
            enrollment_date: new Date().toISOString().split('T')[0],
            is_backlog_student: false,
            notes: `Imported via CSV on ${new Date().toLocaleDateString()}`
          };

          const response = await fetch(import.meta.env.VITE_API_URL + `/api/v1/exams/events/${examEvent.id}/enrollments/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(enrollmentData),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Failed to enroll ${student.roll_number}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error enrolling ${student.roll_number}:`, error);
        }
      }

      let message = `${successCount} valid students enrolled successfully`;
      if (invalidStudents.length > 0) {
        message += `. ${invalidStudents.length} invalid students skipped`;
      }
      if (errorCount > 0) {
        message += `. ${errorCount} students failed to enroll`;
      }

      toast({
        title: "Import Completed",
        description: message,
        variant: successCount > 0 ? "default" : "destructive",
      });
      
      if (successCount > 0) {
        onSuccess();
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import students from Excel",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Upload className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">Excel Import Instructions</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Download the simple template with essential columns</li>
              <li>• Required columns: <strong>roll_number, first_name, last_name, current_semester, department</strong></li>
              <li>• Add students who meet your exam criteria (attendance, eligibility, etc.)</li>
              <li>• System will validate if students exist in database</li>
              <li>• Only valid students will be enrolled automatically</li>
              <li>• Invalid entries will be highlighted for review</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Template Download */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <h4 className="font-medium">Download Excel Template</h4>
          <p className="text-sm text-muted-foreground">
            Essential columns: Roll Number, Name, Current Semester, Department
          </p>
        </div>
        <Button onClick={downloadTemplate} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>

      {/* File Upload */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="csv-file">Select CSV File</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="mt-1"
          />
        </div>

        {file && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium">File Selected: {file.name}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Size: {(file.size / 1024).toFixed(2)} KB
            </p>
          </div>
        )}

        {previewData.length > 0 && (
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Preview - All {previewData.length} rows</h4>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b">
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Roll Number</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Semester</th>
                    <th className="text-left p-2">Department</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index} className={`border-b ${row.isValid ? 'bg-green-50' : 'bg-red-50'}`}>
                      <td className="p-2">
                        {row.isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </td>
                      <td className="p-2 font-mono">{row.roll_number}</td>
                      <td className="p-2">{row.first_name} {row.last_name}</td>
                      <td className="p-2 text-center">{row.current_semester || 'N/A'}</td>
                      <td className="p-2">{row.department || 'N/A'}</td>
                      <td className="p-2 text-blue-600">{row.email || 'N/A'}</td>
                      <td className="p-2">
                        {row.isValid ? (
                          <span className="text-green-600 text-xs">✓ Found in DB</span>
                        ) : (
                          <span className="text-red-600 text-xs">✗ Not found in DB</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex gap-4 text-sm">
              <span className="text-green-600">
                ✓ Valid: {previewData.filter(row => row.isValid).length}
              </span>
              <span className="text-red-600">
                ✗ Invalid: {previewData.filter(row => !row.isValid).length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button 
          onClick={handleUpload} 
          disabled={!file || isUploading || previewData.filter(row => row.isValid).length === 0}
          className="bg-gradient-primary hover:bg-primary-hover"
        >
          {isUploading ? 'Importing...' : 
           previewData.length > 0 ? 
           `Import ${previewData.filter(row => row.isValid).length} Valid Students` : 
           'Import Students'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default StudentEnrollmentManager;
