import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Download, Upload, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";

interface ExamEvent {
  id: number;
  name: string;
  exam_type: string;
  department: string;
  semester: number;
}

interface Subject {
  id: number;
  subject_code: string;
  subject_name: string;
  schedule_id: number;
}

interface StudentMark {
  roll_number: string;
  student_name: string;
  student_id: number;
  marks: number;
}

interface ComponentMarksEntrySimpleProps {
  examEvent: ExamEvent;
}

const ComponentMarksEntrySimple = ({ examEvent }: ComponentMarksEntrySimpleProps) => {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [studentMarks, setStudentMarks] = useState<StudentMark[]>([]);
  const [masterMarks, setMasterMarks] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect component based on exam type
  const getComponentType = () => {
    const examType = examEvent.exam_type.toLowerCase();
    if (examType.includes('internal') || examType.includes('ia')) return 'IA';
    if (examType.includes('oral') || examType.includes('viva')) return 'OR';
    if (examType.includes('end') || examType.includes('semester') || examType.includes('ese')) return 'ESE';
    return 'IA'; // default
  };

  useEffect(() => {
    loadSubjects();
  }, [examEvent.id]);

  const loadSubjects = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/v1/exams/events/${examEvent.id}/schedules/`);
      if (response.ok) {
        const schedules = await response.json();
        const subjectList = schedules.map((s: any) => ({
          id: s.subject_id || s.subject?.id,
          subject_code: s.subject?.subject_code || s.subject?.code || 'N/A',
          subject_name: s.subject?.subject_name || s.subject?.name || 'Unknown',
          schedule_id: s.id
        }));
        setSubjects(subjectList);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadMarksForSubject = async (subject: Subject) => {
    setLoading(true);
    setSelectedSubject(subject);
    
    try {
      // Get enrolled students
      const appsResponse = await fetch(
        `/api/v1/enrollment-applications/exam-event/${examEvent.id}/applications?status=APPROVED`
      );
      
      if (!appsResponse.ok) {
        throw new Error('Failed to load enrolled students');
      }

      const applications = await appsResponse.json();
      
      // Filter students enrolled in this subject
      const enrolledStudents = applications.filter((app: any) => {
        try {
          const selectedSubjects = JSON.parse(app.selected_subjects);
          return selectedSubjects.includes(subject.id);
        } catch {
          return false;
        }
      });

      // Initialize marks array
      const marksData: StudentMark[] = enrolledStudents.map((student: any) => ({
        roll_number: student.roll_number,
        student_name: student.student_name,
        student_id: student.student_id,
        marks: 0
      }));

      setStudentMarks(marksData);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: "Error",
        description: "Failed to load enrolled students",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (subjectId: string) => {
    const subject = subjects.find(s => s.id === parseInt(subjectId));
    if (subject) {
      loadMarksForSubject(subject);
    }
  };

  const handleMarksChange = (studentId: number, marks: string) => {
    setStudentMarks(prev => prev.map(sm => 
      sm.student_id === studentId 
        ? { ...sm, marks: parseFloat(marks) || 0 }
        : sm
    ));
  };

  const handleDownloadMasterTemplate = async () => {
    try {
      // Get all enrolled students
      const appsResponse = await fetch(
        `/api/v1/enrollment-applications/exam-event/${examEvent.id}/applications?status=APPROVED`
      );
      
      if (!appsResponse.ok) {
        throw new Error('Failed to load enrolled students');
      }

      const applications = await appsResponse.json();
      
      // Get component max marks for each subject
      const subjectDetails = await Promise.all(
        subjects.map(async (subject) => {
          try {
            const response = await fetch(import.meta.env.VITE_API_URL + `/api/v1/subjects/${subject.id}`);
            if (response.ok) {
              const subjectData = await response.json();
              const components = subjectData.components || subjectData.subject_components || [];
              const componentType = getComponentType();
              const component = components.find((c: any) => c.component_type === componentType);
              
              return {
                code: subject.subject_code,
                name: subject.subject_name,
                maxMarks: component?.out_of_marks || 0
              };
            }
          } catch (err) {
            console.error(`Failed to load component for ${subject.subject_code}`, err);
          }
          return {
            code: subject.subject_code,
            name: subject.subject_name,
            maxMarks: 0
          };
        })
      );
      
      // Create header with subject code, name, and max marks
      const subjectHeaders = subjectDetails.map(s => `${s.code} - ${s.name} (Max: ${s.maxMarks})`);
      const header = ['roll_number', 'student_name', ...subjectHeaders];
      
      // Create rows for each student
      const rows = applications.map((app: any) => {
        const row = [app.roll_number, app.student_name];
        // Add 0 for each subject
        subjects.forEach(() => row.push('0'));
        return row;
      });
      
      const csvContent = [header, ...rows]
        .map(row => row.join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `marks_master_${examEvent.name.replace(/\s+/g, '_')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Master Template Downloaded",
        description: `CSV template with all ${subjects.length} subjects downloaded`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download master template",
        variant: "destructive"
      });
    }
  };

  const handleUploadMasterCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Parse header to get subject codes
        const header = lines[0].split(',');
        const subjectColumns = header.slice(2).map(col => {
          // Extract subject code from "CS201 - Applied Math (Max: 25)" format
          const match = col.trim().match(/^([A-Z0-9]+)/);
          return match ? match[1] : col.trim();
        });
        
        // Parse data lines
        const dataLines = lines.slice(1);
        
        // Get max marks for each subject component
        const componentMaxMarks: any = {};
        for (const subjectCode of subjectColumns) {
          const subject = subjects.find(s => s.subject_code === subjectCode.trim());
          if (subject) {
            try {
              const response = await fetch(import.meta.env.VITE_API_URL + `/api/v1/subjects/${subject.id}`);
              if (response.ok) {
                const subjectData = await response.json();
                const components = subjectData.components || subjectData.subject_components || [];
                const componentType = getComponentType();
                const component = components.find((c: any) => c.component_type === componentType);
                if (component) {
                  componentMaxMarks[subjectCode.trim()] = component.out_of_marks;
                }
              }
            } catch (err) {
              console.error(`Failed to load component for ${subjectCode}`, err);
            }
          }
        }
        
        // Create preview data with validation
        const previewData = dataLines.map(line => {
          const values = line.split(',');
          const row: any = {
            roll_number: values[0].trim(),
            student_name: values[1].trim(),
            errors: {}
          };
          
          // Add marks for each subject with validation
          subjectColumns.forEach((subjectCode, index) => {
            const marks = parseFloat(values[2 + index]) || 0;
            const maxMarks = componentMaxMarks[subjectCode.trim()];
            
            row[subjectCode.trim()] = marks;
            
            // Validate marks
            if (maxMarks && marks > maxMarks) {
              row.errors[subjectCode.trim()] = `Exceeds max marks (${maxMarks})`;
            }
            if (marks < 0) {
              row.errors[subjectCode.trim()] = 'Negative marks not allowed';
            }
          });
          
          return row;
        });
        
        // Check if there are any errors
        const hasErrors = previewData.some(row => Object.keys(row.errors).length > 0);
        
        setMasterMarks(previewData);
        setShowPreview(true);
        
        if (hasErrors) {
          toast({
            title: "⚠️ Validation Errors Found",
            description: `Preview loaded with errors. Fix highlighted cells before saving.`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "CSV Loaded",
            description: `Preview ${previewData.length} students. Click 'Save All Marks' to confirm.`,
          });
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload Error",
          description: "Failed to parse CSV file. Please check the format.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveAllMarks = async () => {
    if (masterMarks.length === 0) return;

    // Check for validation errors
    const hasErrors = masterMarks.some(row => Object.keys(row.errors || {}).length > 0);
    if (hasErrors) {
      toast({
        title: "Cannot Save",
        description: "Please fix all validation errors before saving",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Get enrolled students
      const appsResponse = await fetch(
        `/api/v1/enrollment-applications/exam-event/${examEvent.id}/applications?status=APPROVED`
      );
      const applications = await appsResponse.json();
      
      let totalSaved = 0;
      
      // Get subject codes from first row
      const subjectCodes = Object.keys(masterMarks[0]).filter(key => 
        key !== 'roll_number' && key !== 'student_name'
      );
      
      // Save marks for each subject
      for (const subjectCode of subjectCodes) {
        const subject = subjects.find(s => s.subject_code === subjectCode);
        if (!subject) continue;
        
        // Get component for this subject
        const subjectResponse = await fetch(import.meta.env.VITE_API_URL + `/api/v1/subjects/${subject.id}`);
        if (!subjectResponse.ok) continue;
        
        const subjectData = await subjectResponse.json();
        const components = subjectData.components || subjectData.subject_components || [];
        const componentType = getComponentType();
        const component = components.find((c: any) => c.component_type === componentType);
        
        if (!component) continue;
        
        // Prepare marks entries
        const marksEntries = masterMarks.map(row => {
          const app = applications.find((a: any) => a.roll_number === row.roll_number);
          if (!app) return null;
          
          // Check if student is enrolled in this subject
          try {
            const selectedSubjects = JSON.parse(app.selected_subjects);
            if (!selectedSubjects.includes(subject.id)) return null;
          } catch {
            return null;
          }
          
          return {
            student_id: app.student_id,
            marks_obtained: row[subjectCode],
            is_absent: row[subjectCode] === 0
          };
        }).filter(entry => entry !== null);
        
        // Save marks for this subject
        if (marksEntries.length > 0) {
          const response = await fetch(import.meta.env.VITE_API_URL + '/api/v1/results/marks/component/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject_id: subject.id,
              subject_component_id: component.id,
              exam_event_id: examEvent.id,
              marks_entries: marksEntries,
              marks_entered_by: "admin"
            })
          });
          
          if (response.ok) {
            totalSaved += marksEntries.length;
          }
        }
      }
      
      toast({
        title: "✅ All Marks Saved Successfully",
        description: `Saved marks for ${totalSaved} student-subject combinations`,
      });
      
      setShowPreview(false);
      setMasterMarks([]);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to save marks. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Marks Entry - {examEvent.name}
          </CardTitle>
          <CardDescription>
            Enter marks for {examEvent.department} - Semester {examEvent.semester}
            <Badge className="ml-2" variant="outline">
              Auto-detected: {getComponentType()} Component
            </Badge>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Master CSV Download/Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Master CSV Template</CardTitle>
          <CardDescription>
            Download template with ALL subjects, edit in Excel, and upload back
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">
                  {subjects.length} subjects scheduled for this exam
                </p>
                <p className="text-sm text-gray-600">
                  Template will include: {subjects.map(s => s.subject_code).join(', ')}
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button onClick={handleDownloadMasterTemplate} variant="default" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download Master CSV Template
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} variant="default" className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Upload Filled CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleUploadMasterCSV}
                className="hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Preview Table */}
      {showPreview && masterMarks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Preview Marks</CardTitle>
                <CardDescription>
                  Review marks before saving - {masterMarks.length} students
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => {
                  setShowPreview(false);
                  setMasterMarks([]);
                }} variant="outline">
                  Cancel
                </Button>
                <Button onClick={handleSaveAllMarks} disabled={loading}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save All Marks'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-2 text-left sticky left-0 bg-gray-50">Roll No</th>
                    <th className="p-2 text-left sticky left-20 bg-gray-50">Student Name</th>
                    {Object.keys(masterMarks[0]).filter(key => 
                      key !== 'roll_number' && key !== 'student_name' && key !== 'errors'
                    ).map(subjectCode => (
                      <th key={subjectCode} className="p-2 text-center">{subjectCode}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {masterMarks.map((row, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium sticky left-0 bg-white">{row.roll_number}</td>
                      <td className="p-2 sticky left-20 bg-white">{row.student_name}</td>
                      {Object.keys(row).filter(key => 
                        key !== 'roll_number' && key !== 'student_name' && key !== 'errors'
                      ).map(subjectCode => {
                        const hasError = row.errors && row.errors[subjectCode];
                        return (
                          <td 
                            key={subjectCode} 
                            className={`p-2 text-center ${hasError ? 'bg-red-100 text-red-700 font-bold' : ''}`}
                            title={hasError || ''}
                          >
                            {row[subjectCode]}
                            {hasError && (
                              <div className="text-xs mt-1">
                                ⚠️ {row.errors[subjectCode]}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Click <strong>"Download Master CSV Template"</strong> to get a CSV with all subjects</li>
              <li>Open the CSV in Excel or Google Sheets</li>
              <li>Enter marks for each student under each subject column</li>
              <li>Save the file</li>
              <li>Click <strong>"Upload Filled CSV"</strong> and select your file</li>
              <li>Review the preview table and click <strong>"Save All Marks"</strong></li>
            </ol>
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Component type ({getComponentType()}) is auto-detected based on exam type.
                All marks will be saved to the correct component automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComponentMarksEntrySimple;
