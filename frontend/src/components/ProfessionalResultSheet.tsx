import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Printer } from "lucide-react";

interface SubjectResult {
  subject_code: string;
  subject_name: string;
  credits: number;
  ia_marks: number;
  oral_marks: number;
  ese_marks: number;
  practical_marks: number;
  tw_marks: number;
  total_marks: number;
  max_marks: number;
  grade: string;
  grade_points: number;
  is_pass: boolean;
}

interface StudentResult {
  roll_number: string;
  student_name: string;
  department: string;
  semester: number;
  academic_year: string;
  subjects: SubjectResult[];
  sgpa: number;
  cgpa: number;
  total_credits: number;
  credits_earned: number;
  result_status: string;
  result_class: string;
}

interface Props {
  studentId: number;
  semester: number;
  academicYear: string;
}

const ProfessionalResultSheet = ({ studentId, semester, academicYear }: Props) => {
  const { toast } = useToast();
  const [result, setResult] = useState<StudentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchResult();
  }, [studentId, semester, academicYear]);

  const fetchResult = async () => {
    setIsLoading(true);
    try {
      // Fetch semester result
      const semResponse = await fetch(import.meta.env.VITE_API_URL + `/api/v1/results/semester/${studentId}/${semester}?academic_year=${academicYear}`);
      if (!semResponse.ok) return;
      
      const semData = await semResponse.json();
      
      // Fetch student details
      const studentResponse = await fetch(import.meta.env.VITE_API_URL + `/api/v1/students/${studentId}`);
      if (!studentResponse.ok) return;
      
      const studentData = await studentResponse.json();
      
      // Fetch subject results
      const subjectsResponse = await fetch(import.meta.env.VITE_API_URL + `/api/v1/results/subject/student/${studentId}?academic_year=${academicYear}&semester=${semester}`);
      if (!subjectsResponse.ok) return;
      
      const subjectsData = await subjectsResponse.json();
      
      setResult({
        roll_number: studentData.roll_number,
        student_name: `${studentData.first_name} ${studentData.middle_name} ${studentData.last_name}`.trim(),
        department: studentData.department,
        semester: semester,
        academic_year: academicYear,
        subjects: subjectsData,
        sgpa: semData.sgpa,
        cgpa: semData.cgpa,
        total_credits: semData.total_credits_attempted,
        credits_earned: semData.total_credits_earned,
        result_status: semData.result_status,
        result_class: semData.result_class
      });
    } catch (error) {
      console.error('Error fetching result:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    // Use browser's print to PDF functionality
    window.print();
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading result sheet...</div>;
  }

  if (!result) {
    return <div className="text-center py-12">No result found</div>;
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons - Hidden in print */}
      <div className="flex gap-2 justify-end print:hidden">
        <Button onClick={handlePrint} variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button onClick={handleExportPDF}>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Result Sheet - A4 size */}
      <div className="result-sheet bg-white" style={{ width: '210mm', margin: '0 auto', padding: '20mm' }}>
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-4">
          <div className="flex justify-between items-start gap-4">
            {/* Logo */}
            <div className="w-24 h-24 flex-shrink-0">
              <img 
                src="/image.png" 
                alt="College Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            
            {/* College Info */}
            <div className="flex-1">
              <h1 className="text-xl font-bold tracking-wide">SARASWATI COLLEGE OF ENGINEERING</h1>
              <p className="text-sm font-semibold">KHARGHAR, NAVI MUMBAI</p>
              <p className="text-xs">(Affiliated to University of Mumbai)</p>
              <p className="text-xs mt-1 leading-tight">
                Result Sheet for T.E. {result?.department.toUpperCase()}
              </p>
              <p className="text-xs leading-tight">
                (ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING) (Statistics for Artificial Intelligence & Data Science)
              </p>
              <p className="text-xs leading-tight">
                (Semester {result?.semester}), Exam: {result?.academic_year}
              </p>
            </div>

            {/* Centre Info */}
            <div className="text-right text-sm font-semibold flex-shrink-0">
              <p>Centre: 692, SCE</p>
            </div>
          </div>
        </div>

        {/* Student Info */}
        <div className="mb-3 grid grid-cols-2 gap-4 text-xs">
          <div>
            <p><span className="font-bold">Seat No / PRN / Name of Student:</span></p>
            <p className="ml-4">{result?.roll_number} / {result?.student_name}</p>
          </div>
          <div className="text-right">
            <p><span className="font-bold">Result:</span> {result?.result_status === 'PASS' ? 'P' : 'F'}</p>
          </div>
        </div>

        {/* Marks Table */}
        <div className="border-2 border-black mb-4 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-black bg-gray-100">
                <th className="border-r border-black p-1 text-left font-bold" rowSpan={2}>Courses →</th>
                {result?.subjects.map((subject, idx) => (
                  <th key={idx} className="border-r border-black p-1 text-center font-bold" colSpan={3}>
                    {subject.subject_code}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-black bg-gray-50">
                {result?.subjects.map((subject, idx) => (
                  <React.Fragment key={idx}>
                    <th className="border-r border-black p-1 text-center text-xs">IA</th>
                    <th className="border-r border-black p-1 text-center text-xs">OR</th>
                    <th className="border-r border-black p-1 text-center text-xs">ESE</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-black">
                <td className="border-r border-black p-1 font-bold">Marks</td>
                {result?.subjects.map((subject, idx) => (
                  <React.Fragment key={idx}>
                    <td className="border-r border-black p-1 text-center font-semibold">{subject.ia_marks}</td>
                    <td className="border-r border-black p-1 text-center font-semibold">{subject.oral_marks}</td>
                    <td className="border-r border-black p-1 text-center font-semibold">{subject.ese_marks}</td>
                  </React.Fragment>
                ))}
              </tr>
              <tr className="border-b border-black">
                <td className="border-r border-black p-1 font-bold">Grade</td>
                {result?.subjects.map((subject, idx) => (
                  <td key={idx} className="border-r border-black p-1 text-center font-bold" colSpan={3}>
                    {subject.grade}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-black">
                <td className="border-r border-black p-1 font-bold">GP/C</td>
                {result?.subjects.map((subject, idx) => (
                  <td key={idx} className="border-r border-black p-1 text-center" colSpan={3}>
                    {subject.grade_points}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary Section */}
        <div className="grid grid-cols-3 gap-3 text-xs mb-4">
          {/* Grade Scale */}
          <div className="border border-black">
            <div className="border-b border-black bg-gray-100 p-1 font-bold text-center">Grade Scale</div>
            <table className="w-full">
              <tbody>
                <tr className="border-b border-black"><td className="p-1 border-r border-black">O</td><td className="p-1 text-center">70-100</td></tr>
                <tr className="border-b border-black"><td className="p-1 border-r border-black">A+</td><td className="p-1 text-center">60-69</td></tr>
                <tr className="border-b border-black"><td className="p-1 border-r border-black">A</td><td className="p-1 text-center">55-59</td></tr>
                <tr className="border-b border-black"><td className="p-1 border-r border-black">B+</td><td className="p-1 text-center">50-54</td></tr>
                <tr className="border-b border-black"><td className="p-1 border-r border-black">B</td><td className="p-1 text-center">45-49</td></tr>
                <tr className="border-b border-black"><td className="p-1 border-r border-black">C</td><td className="p-1 text-center">40-44</td></tr>
                <tr><td className="p-1 border-r border-black">F</td><td className="p-1 text-center">0-39</td></tr>
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="border border-black">
            <div className="border-b border-black bg-gray-100 p-1 font-bold text-center">Summary</div>
            <table className="w-full">
              <tbody>
                <tr className="border-b border-black"><td className="p-1 border-r border-black">Total Subjects</td><td className="p-1 text-center font-bold">{result?.subjects.length}</td></tr>
                <tr className="border-b border-black"><td className="p-1 border-r border-black">Total Credits</td><td className="p-1 text-center font-bold">{result?.total_credits}</td></tr>
                <tr className="border-b border-black"><td className="p-1 border-r border-black">Credits Earned</td><td className="p-1 text-center font-bold">{result?.credits_earned}</td></tr>
                <tr className="border-b border-black"><td className="p-1 border-r border-black">SGPA</td><td className="p-1 text-center font-bold text-blue-600">{result?.sgpa.toFixed(2)}</td></tr>
                <tr className="border-b border-black"><td className="p-1 border-r border-black">CGPA</td><td className="p-1 text-center font-bold text-purple-600">{result?.cgpa.toFixed(2)}</td></tr>
                <tr><td className="p-1 border-r border-black">Result Class</td><td className="p-1 text-center font-bold text-sm">{result?.result_class}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Abbreviations */}
          <div className="border border-black p-2">
            <div className="font-bold text-center mb-1 border-b border-black pb-1">Abbreviations</div>
            <div className="text-xs space-y-0.5">
              <p><span className="font-bold">IA</span> - Internal Assessment</p>
              <p><span className="font-bold">OR</span> - Oral</p>
              <p><span className="font-bold">ESE</span> - End Semester Exam</p>
              <p><span className="font-bold">GP</span> - Grade Points</p>
              <p><span className="font-bold">C</span> - Credits</p>
              <p><span className="font-bold">P</span> - Pass</p>
              <p><span className="font-bold">F</span> - Fail</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="grid grid-cols-4 gap-4 text-xs border-t-2 border-black pt-3">
          <div className="text-center">
            <div className="h-12 mb-1"></div>
            <p className="font-bold">Entered by</p>
          </div>
          <div className="text-center">
            <div className="h-12 mb-1"></div>
            <p className="font-bold">Checked by</p>
          </div>
          <div className="text-center">
            <div className="h-12 mb-1"></div>
            <p className="font-bold">Exam Incharge</p>
          </div>
          <div className="text-center">
            <div className="h-12 mb-1"></div>
            <p className="font-bold">Principal</p>
          </div>
        </div>

        {/* Page Number */}
        <div className="text-right text-xs mt-2 text-gray-600">
          Page 1 of 1
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .result-sheet, .result-sheet * {
            visibility: visible;
          }
          .result-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 20mm;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ProfessionalResultSheet;
