import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Calculator,
  TrendingUp,
  FileText,
  Award,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  BarChart3,
  Loader2,
  Eye,
  Printer
} from "lucide-react";
import ProfessionalResultSheet from './ProfessionalResultSheet';
import DetailedResultSheet from './DetailedResultSheet';

interface Student {
  id: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  roll_number: string;
  department: string;
  current_semester: number;
}

interface Subject {
  id: number;
  subject_code: string;
  subject_name: string;
  credits: number;
}

interface SemesterResult {
  student_id: number;
  student_name: string;
  roll_number: string;
  semester: number;
  academic_year: string;
  total_subjects: number;
  subjects_passed: number;
  subjects_failed: number;
  total_credits_attempted: number;
  total_credits_earned: number;
  sgpa: number;
  cgpa: number;
  overall_percentage: number;
  result_status: string;
  result_class: string;
  has_backlogs: boolean;
}

const ResultsManager = () => {
  const { toast } = useToast();
  const [department, setDepartment] = useState('Computer Science Engineering');
  const [semester, setSemester] = useState(2);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [students, setStudents] = useState<Student[]>([]);
  const [semesterResults, setSemesterResults] = useState<SemesterResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [showResultSheet, setShowResultSheet] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchSemesterResults();
  }, [department, semester, academicYear]);

  const fetchStudents = async () => {
    try {
      const response = await fetch(`/api/v1/students/?department=${encodeURIComponent(department)}&semester=${semester}`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchSemesterResults = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/results/semester/all?department=${encodeURIComponent(department)}&semester=${semester}&academic_year=${academicYear}`);
      if (response.ok) {
        const data = await response.json();
        setSemesterResults(data);
      } else {
        setSemesterResults([]);
      }
    } catch (error) {
      console.error('Error fetching semester results:', error);
      setSemesterResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculateAllSubjectResults = async () => {
    setIsCalculating(true);
    try {
      // Smart endpoint: only calculates for students who have marks
      const response = await fetch(
        `/api/v1/results/calculate-all?department=${encodeURIComponent(department)}&semester=${semester}&academic_year=${academicYear}`,
        { method: 'POST' }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Calculation failed');
      }

      const result = await response.json();
      
      if (result.students_processed === 0) {
        toast({
          title: "No Marks Found",
          description: "No component marks found for this semester. Please enter marks first in the Marks Entry tab.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "✅ Results Calculated!",
          description: `Processed ${result.students_processed} students: ${result.subject_results_calculated} subject results, ${result.semester_results_calculated} semester results (SGPA/CGPA)`,
        });
      }

      // Refresh results table
      await fetchSemesterResults();
    } catch (error: any) {
      console.error('Calculation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to calculate results",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCalculateAllSGPA = async () => {
    // Same smart endpoint handles both subject results AND SGPA in one go
    await handleCalculateAllSubjectResults();
  };

  const getStatusBadge = (status: string) => {
    if (status === 'PASS') {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Pass</Badge>;
    } else {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />ATKT</Badge>;
    }
  };

  const getResultClassBadge = (resultClass: string) => {
    const colors: any = {
      'First Class with Distinction': 'bg-purple-500',
      'First Class': 'bg-blue-500',
      'Second Class': 'bg-yellow-500',
      'Pass Class': 'bg-gray-500',
      'Fail': 'bg-red-500'
    };
    return <Badge className={colors[resultClass] || 'bg-gray-500'}>{resultClass}</Badge>;
  };

  const handleViewResultSheet = (studentId: number) => {
    setSelectedStudentId(studentId);
    setShowResultSheet(true);
  };

  const handlePublishResults = async () => {
    try {
      setIsLoading(true);
      
      const studentIds = semesterResults.map(r => String(r.student_id));
      
      // Publish results for all students in this semester
      const queryParams = new URLSearchParams({
        department,
        semester: semester.toString(),
        academic_year: academicYear
      });
      
      // Add each student_id as a separate query parameter (string IDs)
      studentIds.forEach(id => queryParams.append('student_ids', id));
      
      const response = await fetch(`/api/v1/results/publish?${queryParams.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "✅ Results Published!",
          description: `Published results for ${data.published_count} new students. Students can now view their results in the Student Portal.`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to publish');
      }
    } catch (error: any) {
      toast({
        title: "❌ Publish Failed",
        description: error.message || "Failed to publish results to students",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportAll = async () => {
    try {
      setIsLoading(true);
      
      // Fetch detailed results for all students
      const detailedResults = await Promise.all(
        semesterResults.map(async (result) => {
          const response = await fetch(
            `/api/v1/results/detailed-result-sheet/${result.student_id}?academic_year=${academicYear}&semester=${semester}`
          );
          if (response.ok) {
            return await response.json();
          }
          return null;
        })
      );

      // Create CSV with subject-wise details
      const rows: string[][] = [];
      
      detailedResults.forEach((data) => {
        if (!data) return;
        
        const student = data.student;
        const subjects = data.subjects;
        const summary = data.semester_summary;
        
        // Add student header row
        rows.push([
          student.roll_number,
          student.name,
          '', '', '', '', '', '', '',
          summary.sgpa.toFixed(2),
          summary.cgpa.toFixed(2),
          summary.overall_percentage.toFixed(1) + '%',
          summary.result_status,
          summary.result_class
        ]);
        
        // Add subject rows
        subjects.forEach((subject: any) => {
          rows.push([
            '', // Roll number (empty for subject rows)
            subject.subject_name,
            subject.subject_code,
            subject.components.IA?.marks_obtained?.toString() || '-',
            subject.components.OR?.marks_obtained?.toString() || '-',
            subject.components.ESE?.marks_obtained?.toString() || '-',
            `${subject.total_marks_obtained}/${subject.total_max_marks}`,
            subject.percentage.toFixed(1) + '%',
            subject.grade,
            '', '', '', '',
            subject.is_pass ? 'Pass' : 'Fail'
          ]);
        });
        
        // Add empty row between students
        rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
      });

      const headers = [
        'Roll No', 'Student/Subject Name', 'Subject Code', 
        'IA', 'Viva', 'ESE', 
        'Total', 'Percentage', 'Grade',
        'SGPA', 'CGPA', 'Overall %', 'Status', 'Result Class'
      ];
      
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `detailed_results_${department.replace(/\s+/g, '_')}_Sem${semester}_${academicYear}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "✅ Export Successful",
        description: `Exported detailed results for ${semesterResults.length} students`,
      });
    } catch (error) {
      toast({
        title: "❌ Export Failed",
        description: "Failed to export detailed results",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Select Semester & Department
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue />
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

            <div>
              <Label>Semester</Label>
              <Select value={semester.toString()} onValueChange={(v) => setSemester(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Academic Year</Label>
              <Input 
                value={academicYear} 
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2025-26"
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <TrendingUp className="h-4 w-4" />
              <span>Viewing Results For: {department} - Semester {semester} - {academicYear}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Button 
              onClick={handleCalculateAllSubjectResults}
              disabled={isCalculating}
              className="flex-1"
            >
              {isCalculating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Calculating...</>
              ) : (
                <><Calculator className="h-4 w-4 mr-2" />Calculate All Subject Results</>
              )}
            </Button>

            <Button 
              onClick={handleCalculateAllSGPA}
              disabled={isCalculating}
              className="flex-1"
              variant="secondary"
            >
              {isCalculating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Calculating...</>
              ) : (
                <><TrendingUp className="h-4 w-4 mr-2" />Calculate All SGPA/CGPA</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Semester Results - All Students</CardTitle>
              <CardDescription>SGPA, CGPA, and overall performance</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleExportAll()}>
                <Download className="h-4 w-4 mr-2" />
                Export All Results
              </Button>
              <Button 
                onClick={handlePublishResults}
                className="bg-green-600 hover:bg-green-700"
                disabled={semesterResults.length === 0 || isLoading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Publish Results to Students
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading results...</p>
            </div>
          ) : semesterResults.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-2">No Semester Results Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Calculate semester results to view SGPA/CGPA for all students
              </p>
              <Button onClick={handleCalculateAllSGPA}>
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Semester Results
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">Roll No</th>
                    <th className="p-3 text-left">Student Name</th>
                    <th className="p-3 text-center">Subjects</th>
                    <th className="p-3 text-center">Passed</th>
                    <th className="p-3 text-center">Failed</th>
                    <th className="p-3 text-center">Credits</th>
                    <th className="p-3 text-center">SGPA</th>
                    <th className="p-3 text-center">CGPA</th>
                    <th className="p-3 text-center">Percentage</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-left">Result Class</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {semesterResults.map((result, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{result.roll_number}</td>
                      <td className="p-3">{result.student_name}</td>
                      <td className="p-3 text-center">{result.total_subjects}</td>
                      <td className="p-3 text-center text-green-600 font-semibold">{result.subjects_passed}</td>
                      <td className="p-3 text-center text-red-600 font-semibold">{result.subjects_failed}</td>
                      <td className="p-3 text-center">{result.total_credits_earned}/{result.total_credits_attempted}</td>
                      <td className="p-3 text-center font-bold text-blue-600">{result.sgpa.toFixed(2)}</td>
                      <td className="p-3 text-center font-bold text-purple-600">{result.cgpa.toFixed(2)}</td>
                      <td className="p-3 text-center">{result.overall_percentage.toFixed(1)}%</td>
                      <td className="p-3 text-center">{getStatusBadge(result.result_status)}</td>
                      <td className="p-3">{getResultClassBadge(result.result_class)}</td>
                      <td className="p-3 text-center">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedStudentId(result.student_id);
                            setShowDetailedView(true);
                          }}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Note */}
      {semesterResults.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Award className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Feature Note</h4>
                <p className="text-sm text-blue-800">
                  Bulk calculation will process all students automatically. Results are calculated based on component marks (IA, Viva, ESE) entered in the Marks Entry tab.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Result Sheet Modal */}
      {showDetailedView && selectedStudentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <DetailedResultSheet
                studentId={selectedStudentId}
                academicYear={academicYear}
                semester={semester}
                onClose={() => setShowDetailedView(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Result Sheet Modal */}
      {showResultSheet && selectedStudentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Professional Result Sheet</h2>
              <Button variant="outline" onClick={() => setShowResultSheet(false)}>
                Close
              </Button>
            </div>
            <div className="p-4">
              <ProfessionalResultSheet 
                studentId={selectedStudentId}
                semester={semester}
                academicYear={academicYear}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsManager;
