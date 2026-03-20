import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Student, BRANCHES } from '@/types/student';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import * as XLSX from 'xlsx';

interface BulkUploadProps {
  onStudentsUploaded: () => void;
}

interface UploadResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
}

const BulkUpload = ({ onStudentsUploaded }: BulkUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [existingStudents, setExistingStudents] = useState<any[]>([]);

  const fetchExistingStudents = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/v1/students/');
      if (response.ok) {
        const students = await response.json();
        setExistingStudents(students);
        return students;
      }
    } catch (error) {
      console.error('Error fetching existing students:', error);
    }
    return [];
  };

  const downloadSampleExcel = async () => {
    try {
      // Create template matching manual entry format
      const sampleData = [
        {
          first_name: 'Aarav',
          middle_name: 'Rajesh', 
          last_name: 'Sharma',
          email: 'aarav.sharma@gmail.com',
          phone: '9876543210',
          date_of_birth: '2005-03-15',
          gender: 'male',
          address: 'Flat 101, Sunshine Apartments, Pune',
          category: 'General',
          department: 'Computer Science Engineering',
          mother_name: 'Sunita Sharma',
          current_semester: 2,
          admission_year: 2024
        },
        {
          first_name: 'Priya',
          middle_name: 'Suresh',
          last_name: 'Patel', 
          email: 'priya.patel@gmail.com',
          phone: '9876543211',
          date_of_birth: '2004-07-22',
          gender: 'female',
          address: 'House 25, Green Valley, Pune',
          category: 'OBC',
          department: 'Computer Science Engineering',
          mother_name: 'Kavita Patel',
          current_semester: 4,
          admission_year: 2023
        }
      ];

      // Create CSV content
      const headers = Object.keys(sampleData[0]);
      const csvContent = [
        headers.join(','),
        ...sampleData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'student_bulk_import_template_manual_entry_format.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Template downloaded",
        description: "Template matching manual entry format downloaded",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download template from server",
        variant: "destructive",
      });
    }
  };

  const parseFile = async (file: File): Promise<any[]> => {
    if (file.name.endsWith('.xlsx')) {
      // For Excel files, try to use backend API for parsing
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetch(import.meta.env.VITE_API_URL + '/api/v1/students/import/preview', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          // Convert backend preview format to frontend format
          return result.preview.map((item: any) => item.data);
        }
      } catch (error) {
        console.log('Backend parsing failed, trying frontend parsing');
      }
      
      // Fallback to frontend parsing
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      return data;
    } else {
      // Parse CSV file
      const csvText = await file.text();
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV file must contain headers and at least one data row');
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const values = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        data.push(row);
      }

      return data;
    }
  };

  const validateStudentData = (data: any, existingStudents: any[] = []): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const requiredFields = [
      'first_name', 'middle_name', 'last_name', 'email', 'phone', 'date_of_birth', 
      'gender', 'address', 'category', 'department', 'mother_name', 'current_semester', 'admission_year'
    ];

    requiredFields.forEach(field => {
      if (!data[field] || data[field].toString().trim() === '') {
        errors.push(`Missing ${field}`);
      }
    });

    // Validate gender
    if (data.gender && !['male', 'female', 'other'].includes(data.gender.toLowerCase())) {
      errors.push('Gender must be male, female, or other');
    }

    // Validate current_semester
    if (data.current_semester && (data.current_semester < 1 || data.current_semester > 8)) {
      errors.push('Current semester must be between 1 and 8');
    }

    // Validate department
    const validDepartments = ['Computer Science Engineering', 'Information Technology', 'Electronics and Communication Engineering', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering'];
    if (data.department && !validDepartments.includes(data.department)) {
      errors.push(`Department must be one of: ${validDepartments.join(', ')}`);
    }

    // Validate phone number format
    if (data.phone && !/^\d{10}$/.test(data.phone.toString())) {
      errors.push('Phone number must be 10 digits');
    }

    // Validate email format
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }

    // Check for duplicates against existing students
    if (existingStudents.length > 0) {
      const duplicateByEmail = existingStudents.find(student => 
        student.email && data.email && student.email.toLowerCase() === data.email.toLowerCase()
      );
      if (duplicateByEmail) {
        errors.push(`Email ${data.email} already exists (${duplicateByEmail.first_name} ${duplicateByEmail.last_name})`);
      }

      const duplicateByPhone = existingStudents.find(student => 
        student.phone && data.phone && student.phone === data.phone
      );
      if (duplicateByPhone) {
        errors.push(`Phone ${data.phone} already exists (${duplicateByPhone.first_name} ${duplicateByPhone.last_name})`);
      }

      // Check for duplicate by name combination (less strict)
      const duplicateByName = existingStudents.find(student => 
        student.first_name && student.last_name && data.first_name && data.last_name &&
        student.first_name.toLowerCase() === data.first_name.toLowerCase() &&
        student.last_name.toLowerCase() === data.last_name.toLowerCase() &&
        student.department === data.department
      );
      if (duplicateByName) {
        errors.push(`Student ${data.first_name} ${data.last_name} already exists in ${data.department}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const processUploadedData = async (data: any[]): Promise<UploadResult> => {
    const formData = new FormData();
    
    if (data.length === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        errors: ['No data to process']
      };
    }

    // Create a temporary file with the data
    let fileContent: string | Blob;
    let fileName: string;
    
    // Check if original file was Excel by looking at the first few rows
    // If it has consistent structure, assume it came from Excel
    const hasConsistentStructure = data.every(row => 
      typeof row === 'object' && 
      Object.keys(row).length > 0
    );
    
    if (hasConsistentStructure) {
      // Create Excel file
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      fileContent = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      fileName = 'upload.xlsx';
    } else {
      // Create CSV file (fallback)
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];
      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header] || '';
          return `"${value.toString().replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      });
      fileContent = csvRows.join('\n');
      fileName = 'upload.csv';
    }

    const file = new File([fileContent], fileName);
    formData.append('file', file);

    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/v1/students/import/save', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload students');
      }

      const result = await response.json();
      return {
        total: result.total || data.length,
        successful: result.successful || 0,
        failed: result.failed || 0,
        errors: result.errors || []
      };
    } catch (error) {
      return {
        total: data.length,
        successful: 0,
        failed: data.length,
        errors: [`Failed to import students: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV or Excel (.xlsx) file",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setUploadResult(null);
    setParsedData(null);
    setShowPreview(false);

    try {
      const data = await parseFile(file);
      
      // Validate the data structure
      if (data.length === 0) {
        throw new Error('No data found in file');
      }

      // Check if required columns exist - support both old and new formats
      const headers = Object.keys(data[0]);
      console.log('File headers:', headers);
      
      // Check for manual entry format (matches StudentEntryForm)
      const manualEntryColumns = ['first_name', 'middle_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender', 'address', 'category', 'department', 'mother_name', 'current_semester', 'admission_year'];
      const missingManualEntry = manualEntryColumns.filter(col => !headers.includes(col));
      
      // Check for legacy format (Title Case - for backward compatibility)
      const legacyFormatColumns = ['First Name', 'Middle Name', 'Last Name', 'Address', 'Gender', 'Category', 'Date of Birth', 'Phone Number', 'Branch', 'Year', 'Mother Name'];
      const missingLegacyFormat = legacyFormatColumns.filter(col => !headers.includes(col));
      
      console.log('Missing manual entry columns:', missingManualEntry);
      console.log('Missing legacy format columns:', missingLegacyFormat);
      
      // If manual entry format is complete, proceed (preferred format)
      if (missingManualEntry.length === 0) {
        console.log('Using manual entry format - all columns present');
      }
      // If legacy format is complete, convert to manual entry format
      else if (missingLegacyFormat.length === 0) {
        console.log('Converting legacy format to manual entry format');
        data.forEach(row => {
          // Convert Title Case to lowercase with underscores
          row['first_name'] = row['First Name'] || '';
          row['middle_name'] = row['Middle Name'] || '';
          row['last_name'] = row['Last Name'] || '';
          row['email'] = row['Email'] || `${row['First Name']?.toLowerCase()}.${row['Last Name']?.toLowerCase()}@gmail.com`;
          row['phone'] = row['Phone Number'] || '';
          row['date_of_birth'] = row['Date of Birth'] || '';
          row['gender'] = row['Gender']?.toLowerCase() || 'male';
          row['address'] = row['Address'] || '';
          row['category'] = row['Category'] || 'General';
          row['department'] = row['Branch'] || 'Computer Science Engineering';
          row['mother_name'] = row['Mother Name'] || '';
          row['current_semester'] = row['Year'] === '1st Year' ? 2 : 
                                   row['Year'] === '2nd Year' ? 4 :
                                   row['Year'] === '3rd Year' ? 6 : 8;
          row['admission_year'] = 2024;
          
          // Remove legacy columns
          delete row['First Name'];
          delete row['Middle Name'];
          delete row['Last Name'];
          delete row['Phone Number'];
          delete row['Date of Birth'];
          delete row['Gender'];
          delete row['Address'];
          delete row['Category'];
          delete row['Branch'];
          delete row['Mother Name'];
          delete row['Year'];
        });
      }
      // If neither format is complete, show error
      else {
        throw new Error(`File format not recognized. Please use the template with columns: ${manualEntryColumns.join(', ')}`);
      }

      // Fetch existing students for duplicate checking
      const existingStudentsData = await fetchExistingStudents();
      
      setParsedData(data);
      
      toast({
        title: "File parsed successfully",
        description: `Found ${data.length} student records`,
      });
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: "Error parsing file",
        description: error instanceof Error ? error.message : "Failed to parse file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddStudents = async () => {
    if (!parsedData) return;

    setIsAdding(true);
    setUploadResult(null);

    try {
      const result = await processUploadedData(parsedData);
      setUploadResult(result);
      
      if (result.successful > 0) {
        toast({
          title: "Students added successfully",
          description: `Successfully imported ${result.successful} students`,
        });
        onStudentsUploaded();
        setParsedData(null);
        setShowPreview(false);
      } else {
        toast({
          title: "Import failed",
          description: "No students were successfully imported",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error importing students",
        description: error instanceof Error ? error.message : "Failed to import students",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Student Upload
          </CardTitle>
          <CardDescription>
            Upload student data from Excel (.xlsx) or CSV files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-lg font-medium">Drop your file here</p>
                <p className="text-sm text-gray-500">or click to browse</p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                variant="outline"
              >
                {isProcessing ? "Processing..." : "Choose File"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Supported formats: CSV (.csv) - For best results, use CSV format
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSampleExcel}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> If you have an Excel file from Numbers, please save it as CSV format for best compatibility.
            </p>
          </div>
        </CardContent>
      </Card>


      {/* Preview Section */}
      {showPreview && parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Data Preview ({parsedData.length} records)
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => setShowPreview(false)} variant="outline" size="sm">
                Hide Preview
              </Button>
              <Button onClick={() => setParsedData(null)} variant="outline" size="sm">
                Clear Data
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Showing first 5 records. Total: {parsedData.length}
              </div>
              
              {/* Validation Summary */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-blue-50 rounded">
                  <div className="font-medium text-blue-700">Total Records</div>
                  <div className="text-xl font-bold text-blue-900">{parsedData.length}</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="font-medium text-green-700">Valid Records</div>
                  <div className="text-xl font-bold text-green-900">
                    {parsedData.filter(row => validateStudentData(row, existingStudents).isValid).length}
                  </div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded">
                  <div className="font-medium text-red-700">Invalid Records</div>
                  <div className="text-xl font-bold text-red-900">
                    {parsedData.filter(row => !validateStudentData(row, existingStudents).isValid).length}
                  </div>
                </div>
              </div>

              {/* Sample Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      {Object.keys(parsedData[0]).map(header => (
                        <th key={header} className="border border-gray-300 px-2 py-1 text-left font-medium">
                          {header}
                        </th>
                      ))}
                      <th className="border border-gray-300 px-2 py-1 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((row, index) => {
                      const validation = validateStudentData(row, existingStudents);
                      return (
                        <tr key={index} className={validation.isValid ? '' : 'bg-red-50'}>
                          {Object.values(row).map((value, cellIndex) => (
                            <td key={cellIndex} className="border border-gray-300 px-2 py-1">
                              {String(value)}
                            </td>
                          ))}
                          <td className="border border-gray-300 px-2 py-1">
                            {validation.isValid ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">Valid</Badge>
                            ) : (
                              <div>
                                <Badge variant="destructive">Invalid</Badge>
                                <div className="text-xs text-red-600 mt-1">
                                  {validation.errors.slice(0, 2).map((error, i) => (
                                    <div key={i}>{error}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Button 
                onClick={handleAddStudents} 
                className="w-full" 
                disabled={isAdding || parsedData.filter(row => validateStudentData(row, existingStudents).isValid).length === 0}
              >
                {isAdding ? "Adding Students..." : `Add ${parsedData.filter(row => validateStudentData(row, existingStudents).isValid).length} Valid Students`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {uploadResult.successful > 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="font-medium text-blue-700">Total</div>
                <div className="text-xl font-bold text-blue-900">{uploadResult.total}</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="font-medium text-green-700">Successful</div>
                <div className="text-xl font-bold text-green-900">{uploadResult.successful}</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded">
                <div className="font-medium text-red-700">Failed</div>
                <div className="text-xl font-bold text-red-900">{uploadResult.failed}</div>
              </div>
            </div>
            
            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Errors:
                </h4>
                <ul className="text-sm text-red-600 space-y-1">
                  {uploadResult.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show preview button when data is parsed */}
      {parsedData && !showPreview && (
        <div className="text-center">
          <Button onClick={() => setShowPreview(true)} variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Preview Data ({parsedData.length} records)
          </Button>
        </div>
      )}
    </div>
  );
};

export default BulkUpload;
