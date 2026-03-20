import { Student } from '@/types/student';

export const generateRollNumber = async (branch: string, year: string): Promise<string> => {
  // Department starting ranges
  const departmentRanges: Record<string, number> = {
    'Computer Science Engineering': 1000,
    'Information Technology': 3000,
    'Electronics and Communication Engineering': 5000,
    'Electrical Engineering': 7000,
    'Mechanical Engineering': 8000,
    'Civil Engineering': 9000,
  };
  
  const startRange = departmentRanges[branch] || 1000;
  
  try {
    // Get the next sequential number from backend
    const response = await fetch(import.meta.env.VITE_API_URL + `/api/v1/students/next-roll-number?department=${encodeURIComponent(branch)}&start_range=${startRange}`);
    if (response.ok) {
      const data = await response.json();
      return `SCOE${data.roll_number}`;
    }
  } catch (error) {
    console.error('Error getting next roll number from backend:', error);
  }
  
  // Fallback: generate based on existing students in localStorage
  const existingStudents = getStudentsFromStorage();
  const departmentStudents = existingStudents.filter(s => s.department === branch || s.branch === branch);
  
  // Find the highest roll number for this department
  let maxNumber = startRange;
  departmentStudents.forEach(student => {
    const rollNum = student.roll_number || student.rollNumber;
    if (rollNum && rollNum.startsWith('SCOE')) {
      const num = parseInt(rollNum.substring(4));
      if (num >= startRange && num < startRange + 1000 && num > maxNumber) {
        maxNumber = num;
      }
    }
  });
  
  const nextNumber = maxNumber + 1;
  return `SCOE${nextNumber.toString().padStart(4, '0')}`;
};

export const generatePersonalEmail = (name: string, rollNumber: string, branch: string = 'Computer Science Engineering'): string => {
  // Clean the name and split into parts
  const cleanName = name.trim().toLowerCase().replace(/[^a-z\s]/g, '');
  const nameParts = cleanName.split(/\s+/).filter(part => part.length > 0);
  
  // Create email prefix from first and last name
  let emailPrefix;
  if (nameParts.length >= 2) {
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1]; // Take the last part as surname
    emailPrefix = `${firstName}.${lastName}`;
  } else {
    emailPrefix = nameParts[0] || 'student';
  }
  
  // Map branch to short department abbreviations
  const branchToDepartment: Record<string, string> = {
    'Computer Science Engineering': 'cse',
    'Information Technology': 'it',
    'Electronics and Communication Engineering': 'ece',
    'Electrical Engineering': 'ee',
    'Mechanical Engineering': 'me',
    'Civil Engineering': 'ce',
  };
  
  const department = branchToDepartment[branch] || 'cse';
  
  return `${emailPrefix}@${department}.scoe.edu.in`;
};

export const saveStudentToStorage = (student: Student): void => {
  const students = getStudentsFromStorage();
  const existingIndex = students.findIndex(s => s.id === student.id);
  
  if (existingIndex >= 0) {
    students[existingIndex] = { ...student, updatedAt: new Date().toISOString() };
  } else {
    students.push({ ...student, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  
  localStorage.setItem('campus_students', JSON.stringify(students));
};

export const getStudentsFromStorage = (): Student[] => {
  try {
    const stored = localStorage.getItem('campus_students');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading students from storage:', error);
    return [];
  }
};

export const deleteStudentFromStorage = (studentId: string): void => {
  const students = getStudentsFromStorage();
  const filtered = students.filter(s => s.id !== studentId);
  localStorage.setItem('campus_students', JSON.stringify(filtered));
};

export const exportStudentsToCSV = (students: Student[]): string => {
  const headers = [
    'Roll Number',
    'Name', 
    'Personal Email',
    'Phone Number',
    'Address',
    'Gender',
    'Category',
    'Date of Birth',
    'Branch',
    'Year',
    'Mother Name',
    'Subjects',
    'Created At'
  ];
  
  const csvContent = [
    headers.join(','),
    ...students.map(student => [
      student.rollNumber,
      `"${student.name}"`,
      student.personalEmail,
      student.phoneNumber,
      `"${student.address}"`,
      student.gender,
      student.category,
      student.dateOfBirth,
      `"${student.branch}"`,
      student.year,
      `"${student.motherName}"`,
      `"${student.subjects.join('; ')}"`,
      student.createdAt
    ].join(','))
  ].join('\n');
  
  return csvContent;
};

export const downloadCSV = (csvContent: string, filename: string = 'students.csv'): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};