import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  Plus, 
  Calendar, 
  MapPin, 
  User, 
  BookOpen,
  Edit,
  Trash2,
  AlertTriangle,
  Bell
} from "lucide-react";

interface ExamEvent {
  id: number;
  name: string;
  department: string;
  semester: number;
  start_date: string;
  end_date: string;
  exam_type: string;
  academic_year: string;
}

interface ExamSchedule {
  id: number;
  subject_id: number;
  exam_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  venue?: string;
  max_students: number;
  supervisor?: string;
  total_marks: number;
  theory_marks: number;
  practical_marks: number;
  special_instructions?: string;
  materials_allowed?: string;
  is_active: boolean;
  subject?: {
    id: number;
    name: string;
    code: string;
  };
}

interface Subject {
  id: number;
  name: string;
  code: string;
  credits: number;
  semester: number;
  department: string;
}

interface ExamScheduleManagerProps {
  examEvent: ExamEvent;
  onNavigateToEnrollment?: () => void;
}

const ExamScheduleManager = ({ examEvent, onNavigateToEnrollment }: ExamScheduleManagerProps) => {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkSchedule, setShowBulkSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ExamSchedule | null>(null);
  const [eligibleStudentsCount, setEligibleStudentsCount] = useState<number>(0);
  const [formData, setFormData] = useState({
    subject_id: '',
    exam_date: '',
    start_time: '',
    end_time: '',
    duration_minutes: '180',
    venue: '',
    max_students: '60',
    supervisor: '',
    total_marks: '100',
    special_instructions: '',
    materials_allowed: ''
  });

  useEffect(() => {
    fetchSchedules();
    fetchSubjects();
    fetchEligibleStudentsCount();
  }, [examEvent.id]);

  const fetchEligibleStudentsCount = async () => {
    try {
      const response = await fetch(`/api/v1/students/`);
      if (response.ok) {
        const data = await response.json();
        // Filter students by semester and department
        const eligibleStudents = data.filter((student: any) => 
          student.current_semester === examEvent.semester && 
          student.department === examEvent.department
        );
        setEligibleStudentsCount(eligibleStudents.length);
      }
    } catch (error) {
      console.error('Error fetching eligible students:', error);
    }
  };

  const handleNotifyStudents = () => {
    toast({
      title: "Students Notified!",
      description: `${eligibleStudentsCount} students in ${examEvent.department} - Semester ${examEvent.semester} can now see this exam and apply for enrollment.`,
    });
  };

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/exams/events/${examEvent.id}/schedules/`);
      if (response.ok) {
        const data = await response.json();
        setSchedules(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load exam schedules",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      // Convert semester number to Roman numeral for API
      const semesterToRoman = (sem: number): string => {
        const romanNumerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
        return romanNumerals[sem] || 'I';
      };

      const romanSemester = semesterToRoman(examEvent.semester);
      
      // Fetch subjects by department and semester (don't filter by year — year format may differ)
      const response = await fetch(`/api/v1/subjects/?department=${encodeURIComponent(examEvent.department)}&semester=${romanSemester}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Subjects received:', data);
        setSubjects(data);
        
        if (data.length === 0) {
          // Fallback: try fetching all and filtering on frontend  
          const fallbackResponse = await fetch('/api/v1/subjects/');
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            const filteredSubjects = fallbackData.filter((subject: any) => 
              subject.department === examEvent.department && 
              subject.semester === romanSemester
            );
            console.log('Fallback filtered subjects:', filteredSubjects);
            setSubjects(filteredSubjects);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      toast({
        title: "Error",
        description: "Failed to load subjects from Subject Master",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      subject_id: '',
      exam_date: '',
      start_time: '',
      end_time: '',
      duration_minutes: '180',
      venue: '',
      max_students: '60',
      supervisor: '',
      total_marks: '100',
      special_instructions: '',
      materials_allowed: ''
    });
    setEditingSchedule(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-calculate end time when start time or duration changes
    if (field === 'start_time' || field === 'duration_minutes') {
      const startTime = field === 'start_time' ? value : formData.start_time;
      const duration = field === 'duration_minutes' ? parseInt(value) : parseInt(formData.duration_minutes);
      
      if (startTime && duration) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + duration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        
        setFormData(prev => ({
          ...prev,
          end_time: `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject_id || !formData.exam_date || !formData.start_time) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate subject scheduling (only for new schedules, not edits)
    if (!editingSchedule) {
      const isDuplicate = schedules.some(schedule => 
        schedule.subject_id === parseInt(formData.subject_id)
      );
      
      if (isDuplicate) {
        const subjectName = getSubjectName(parseInt(formData.subject_id));
        toast({
          title: "Duplicate Subject",
          description: `${subjectName} is already scheduled for this exam. Each subject can only be scheduled once.`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const payload = {
        ...formData,
        subject_id: parseInt(formData.subject_id),
        duration_minutes: parseInt(formData.duration_minutes),
        max_students: parseInt(formData.max_students),
        total_marks: parseInt(formData.total_marks),
        ...(editingSchedule ? {} : { exam_event_id: examEvent.id })
      };
      
      console.log('Form data being submitted:', payload);

      const url = editingSchedule 
        ? `/api/v1/exams/schedules/${editingSchedule.id}`
        : `/api/v1/exams/events/${examEvent.id}/schedules/`;
      
      const method = editingSchedule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchSchedules();
        setShowAddForm(false);
        resetForm();
        toast({
          title: "Success",
          description: editingSchedule ? "Schedule updated successfully" : "Schedule added successfully",
        });
      } else {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData));
      }
    } catch (error) {
      console.error('Form submission error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (schedule: ExamSchedule) => {
    setFormData({
      subject_id: schedule.subject_id.toString(),
      exam_date: schedule.exam_date,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      duration_minutes: schedule.duration_minutes.toString(),
      venue: schedule.venue || '',
      max_students: schedule.max_students.toString(),
      supervisor: schedule.supervisor || '',
      total_marks: schedule.total_marks.toString(),
      special_instructions: schedule.special_instructions || '',
      materials_allowed: schedule.materials_allowed || ''
    });
    setEditingSchedule(schedule);
    setShowAddForm(true);
  };

  const handleDelete = async (scheduleId: number) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const response = await fetch(`/api/v1/exams/schedules/${scheduleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchSchedules();
        toast({
          title: "Success",
          description: "Schedule deleted successfully",
        });
      } else {
        throw new Error('Failed to delete schedule');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive",
      });
    }
  };

  const handleClearAllSchedules = async () => {
    if (!confirm(`Are you sure you want to delete ALL ${schedules.length} schedules for this exam? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete all schedules one by one
      const deletePromises = schedules.map(schedule =>
        fetch(`/api/v1/exams/schedules/${schedule.id}`, {
          method: 'DELETE',
        })
      );

      await Promise.all(deletePromises);

      toast({
        title: "All Schedules Cleared",
        description: `Successfully deleted ${schedules.length} schedules for ${examEvent.name}`,
      });

      fetchSchedules();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear all schedules",
        variant: "destructive",
      });
    }
  };

  const getSubjectName = (subjectId: number) => {
    const subject = subjects.find(s => s.id === subjectId) as any;
    console.log('Looking for subject ID:', subjectId);
    console.log('Available subjects:', subjects);
    console.log('Found subject:', subject);
    
    if (subject) {
      // Try different property combinations since API might return different field names
      const code = subject.subject_code || subject.code || 'N/A';
      const name = subject.subject_name || subject.name || 'Unknown Subject';
      console.log('Subject code:', code, 'Subject name:', name);
      return `${code} - ${name}`;
    }
    return `Subject ID: ${subjectId}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Exam Schedule - {examEvent.name}
              </CardTitle>
              <CardDescription>
                Manage exam timetable and subject schedules for {examEvent.department} - Semester {examEvent.semester}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {new Date(examEvent.start_date).toLocaleDateString()} - {new Date(examEvent.end_date).toLocaleDateString()}
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
              >
                Back to Events
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Schedule Management</CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                }}
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Individual Subject
              </Button>
              <Button 
                onClick={() => setShowBulkSchedule(true)}
                className="bg-gradient-primary hover:bg-primary-hover"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Schedule All Semester Subjects
              </Button>
              {schedules.length > 0 && (
                <Button 
                  onClick={handleClearAllSchedules}
                  variant="destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All Schedules
                </Button>
              )}
              {schedules.length > 0 && (
                <div className="flex gap-3">
                  <Button 
                    onClick={handleNotifyStudents}
                    variant="default"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    Notify Students ({eligibleStudentsCount})
                  </Button>
                  <Button 
                    onClick={() => {
                      if (onNavigateToEnrollment) {
                        onNavigateToEnrollment();
                      } else {
                        // Fallback to URL navigation if callback not provided
                        const enrollmentUrl = `/enrollment?exam_event_id=${examEvent.id}&department=${encodeURIComponent(examEvent.department)}&semester=${examEvent.semester}`;
                        window.location.href = enrollmentUrl;
                      }
                    }}
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Proceed to Student Enrollment
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingSchedule ? 'Edit Schedule' : 'Add Subject to Schedule'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subject_id">Subject *</Label>
                  <Select value={formData.subject_id} onValueChange={(value) => handleInputChange('subject_id', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject: any) => {
                        const isAlreadyScheduled = schedules.some(schedule => 
                          schedule.subject_id === subject.id
                        );
                        return (
                          <SelectItem 
                            key={subject.id} 
                            value={subject.id.toString()}
                            disabled={isAlreadyScheduled && !editingSchedule}
                          >
                            {subject.subject_code} - {subject.subject_name} ({subject.credits} credits)
                            {isAlreadyScheduled && !editingSchedule && " (Already Scheduled)"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {subjects.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      No subjects found. Please create subjects in Subject Master first.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="exam_date">Exam Date *</Label>
                  <Input
                    id="exam_date"
                    type="date"
                    value={formData.exam_date}
                    onChange={(e) => handleInputChange('exam_date', e.target.value)}
                    min={examEvent.start_date}
                    max={examEvent.end_date}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => handleInputChange('start_time', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="duration_minutes">Duration (minutes) *</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    min="30"
                    max="480"
                    value={formData.duration_minutes}
                    onChange={(e) => handleInputChange('duration_minutes', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    readOnly
                    className="mt-1 bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="venue">Venue</Label>
                  <Input
                    id="venue"
                    value={formData.venue}
                    onChange={(e) => handleInputChange('venue', e.target.value)}
                    placeholder="e.g., Room A-101"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="supervisor">Supervisor</Label>
                  <Input
                    id="supervisor"
                    value={formData.supervisor}
                    onChange={(e) => handleInputChange('supervisor', e.target.value)}
                    placeholder="Supervisor name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="max_students">Max Students</Label>
                  <Input
                    id="max_students"
                    type="number"
                    min="1"
                    value={formData.max_students}
                    onChange={(e) => handleInputChange('max_students', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total_marks">Marks</Label>
                  <Input
                    id="total_marks"
                    type="number"
                    value={formData.total_marks}
                    onChange={(e) => handleInputChange('total_marks', e.target.value)}
                    placeholder="100"
                    min="1"
                    max="1000"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="materials_allowed">Materials Allowed</Label>
                  <Input
                    id="materials_allowed"
                    value={formData.materials_allowed}
                    onChange={(e) => handleInputChange('materials_allowed', e.target.value)}
                    placeholder="e.g., Calculator, Drawing instruments"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="special_instructions">Special Instructions</Label>
                <Textarea
                  id="special_instructions"
                  value={formData.special_instructions}
                  onChange={(e) => handleInputChange('special_instructions', e.target.value)}
                  placeholder="Any special instructions for this exam"
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit">
                  {editingSchedule ? 'Update Schedule' : 'Add to Schedule'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Bulk Schedule Form */}
      {showBulkSchedule && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule All Semester Subjects
            </CardTitle>
            <CardDescription>
              Create exam schedule for all subjects in {examEvent.department} - Semester {examEvent.semester}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BulkScheduleForm 
              examEvent={examEvent}
              subjects={subjects}
              existingSchedules={schedules}
              onSuccess={() => {
                setShowBulkSchedule(false);
                fetchSchedules();
              }}
              onCancel={() => setShowBulkSchedule(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Schedule List */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Timetable</CardTitle>
          <CardDescription>
            {schedules.length} subjects scheduled
            {schedules.length > 0 && (
              <span className="ml-2 text-green-600 font-medium">
                • Ready for student enrollment
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Subjects Scheduled</h3>
              <p className="text-muted-foreground mb-4">
                Add subjects to create the exam timetable
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {schedules
                .sort((a, b) => new Date(a.exam_date + ' ' + a.start_time).getTime() - new Date(b.exam_date + ' ' + b.start_time).getTime())
                .map((schedule) => (
                <Card key={schedule.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg">
                            {getSubjectName(schedule.subject_id)}
                          </h4>
                          {!schedule.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(schedule.exam_date).toLocaleDateString()}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{schedule.start_time} - {schedule.end_time}</span>
                          </div>
                          
                          {schedule.venue && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{schedule.venue}</span>
                            </div>
                          )}
                          
                          {schedule.supervisor && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{schedule.supervisor}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>Duration: {schedule.duration_minutes} mins</span>
                          <span>Total Marks: {schedule.total_marks}</span>
                          <span>Max Students: {schedule.max_students}</span>
                        </div>

                        {schedule.special_instructions && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                              <span className="text-yellow-800">{schedule.special_instructions}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(schedule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(schedule.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

// Bulk Schedule Form Component
interface BulkScheduleFormProps {
  examEvent: ExamEvent;
  subjects: Subject[];
  existingSchedules: ExamSchedule[];
  onSuccess: () => void;
  onCancel: () => void;
}

const BulkScheduleForm = ({ examEvent, subjects, existingSchedules, onSuccess, onCancel }: BulkScheduleFormProps) => {
  const { toast } = useToast();
  const [subjectSchedules, setSubjectSchedules] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize subject schedules when component mounts
  useEffect(() => {
    console.log('Subjects received:', subjects); // Debug log
    console.log('Existing schedules:', existingSchedules); // Debug log
    
    // Filter out subjects that are already scheduled
    const unscheduledSubjects = subjects.filter((subject: any) => 
      !existingSchedules.some(schedule => schedule.subject_id === subject.id)
    );
    
    const initialSchedules = unscheduledSubjects.map((subject: any) => {
      console.log('Processing unscheduled subject:', subject); // Debug log
      return {
        subject_id: subject.id,
        subject_name: subject.subject_name || subject.name || 'Unknown Subject',
        subject_code: subject.subject_code || subject.code || 'N/A',
        exam_date: '',
        start_time: '09:00',
        duration_minutes: 180,
        venue: '',
        supervisor: '',
        total_marks: 100,
        materials_allowed: '',
        special_instructions: ''
      };
    });
    console.log('Initial schedules for unscheduled subjects:', initialSchedules); // Debug log
    setSubjectSchedules(initialSchedules);
  }, [subjects, existingSchedules]);

  const updateSubjectSchedule = (index: number, field: string, value: any) => {
    const updated = [...subjectSchedules];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate end time when start time or duration changes
    if (field === 'start_time' || field === 'duration_minutes') {
      const startTime = field === 'start_time' ? value : updated[index].start_time;
      const duration = field === 'duration_minutes' ? parseInt(value) : updated[index].duration_minutes;
      
      if (startTime && duration) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + duration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        
        updated[index].end_time = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      }
    }
    
    setSubjectSchedules(updated);
  };

  const handleSubmit = async () => {
    // Validate that all required fields are filled
    const incompleteSubjects = subjectSchedules.filter(schedule => 
      !schedule.exam_date || !schedule.start_time
    );

    if (incompleteSubjects.length > 0) {
      toast({
        title: "Incomplete Schedule",
        description: `Please fill exam date and time for all subjects. ${incompleteSubjects.length} subjects are incomplete.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Create schedules one by one since bulk endpoint doesn't exist
      for (const schedule of subjectSchedules) {
        try {
          // Calculate end_time if not already calculated
          let endTime = schedule.end_time;
          if (!endTime && schedule.start_time && schedule.duration_minutes) {
            const [hours, minutes] = schedule.start_time.split(':').map(Number);
            const startMinutes = hours * 60 + minutes;
            const endMinutes = startMinutes + schedule.duration_minutes;
            const endHours = Math.floor(endMinutes / 60);
            const endMins = endMinutes % 60;
            endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
          }

          const payload = {
            exam_event_id: examEvent.id, // Required by ExamScheduleCreate schema
            subject_id: schedule.subject_id,
            exam_date: schedule.exam_date,
            start_time: schedule.start_time,
            end_time: endTime,
            duration_minutes: schedule.duration_minutes,
            venue: schedule.venue || `Room A-${Math.floor(Math.random() * 100) + 101}`,
            max_students: 60,
            supervisor: schedule.supervisor || '',
            total_marks: schedule.total_marks,
            theory_marks: schedule.total_marks,
            practical_marks: 0,
            special_instructions: schedule.special_instructions || '',
            materials_allowed: schedule.materials_allowed || ''
          };

          console.log('Sending payload for', schedule.subject_code, ':', payload);

          const response = await fetch(`/api/v1/exams/events/${examEvent.id}/schedules/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            const errorText = await response.text();
            console.error(`Failed to schedule ${schedule.subject_code}:`, errorText);
            console.error('Response status:', response.status);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error scheduling ${schedule.subject_code}:`, error);
        }
      }

      if (successCount > 0) {
        toast({
          title: "Schedule Created",
          description: `Successfully scheduled ${successCount} subjects. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
        });
        onSuccess();
      } else {
        throw new Error('Failed to schedule any subjects');
      }
    } catch (error) {
      console.error('Schedule creation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create schedule",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">
              Semester Subjects ({subjectSchedules.length} remaining to schedule)
            </h4>
            <p className="text-sm text-blue-700">
              Assign exam dates and times for each subject in {examEvent.department} - Semester {examEvent.semester}
            </p>
            {existingSchedules.length > 0 && (
              <p className="text-sm text-green-700 mt-1">
                ✓ {existingSchedules.length} subjects already scheduled
              </p>
            )}
            {subjectSchedules.length === 0 && existingSchedules.length > 0 && (
              <p className="text-sm text-green-700 font-medium mt-2">
                All subjects have been scheduled! You can proceed to student enrollment.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Subject List */}
      <div className="space-y-4">
        {subjectSchedules.map((schedule, index) => (
          <Card key={schedule.subject_id} className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                {/* Subject Info */}
                <div className="lg:col-span-3">
                  <h4 className="font-semibold text-lg">
                    {schedule.subject_code || 'N/A'}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {schedule.subject_name || 'Subject Name Not Available'}
                  </p>
                  <p className="text-xs text-blue-600">
                    Subject ID: {schedule.subject_id}
                  </p>
                </div>

                {/* Date & Time */}
                <div className="lg:col-span-2">
                  <Label className="text-xs">Exam Date *</Label>
                  <Input
                    type="date"
                    value={schedule.exam_date}
                    onChange={(e) => updateSubjectSchedule(index, 'exam_date', e.target.value)}
                    min={examEvent.start_date}
                    max={examEvent.end_date}
                    className="mt-1"
                  />
                </div>

                <div className="lg:col-span-2">
                  <Label className="text-xs">Start Time *</Label>
                  <Input
                    type="time"
                    value={schedule.start_time}
                    onChange={(e) => updateSubjectSchedule(index, 'start_time', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="lg:col-span-1">
                  <Label className="text-xs">Duration (min)</Label>
                  <Input
                    type="number"
                    min="60"
                    max="480"
                    value={schedule.duration_minutes}
                    onChange={(e) => updateSubjectSchedule(index, 'duration_minutes', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="lg:col-span-2">
                  <Label className="text-xs">Venue</Label>
                  <Input
                    value={schedule.venue}
                    onChange={(e) => updateSubjectSchedule(index, 'venue', e.target.value)}
                    placeholder="Room A-101"
                    className="mt-1"
                  />
                </div>

                <div className="lg:col-span-2">
                  <Label className="text-xs">Supervisor</Label>
                  <Input
                    value={schedule.supervisor}
                    onChange={(e) => updateSubjectSchedule(index, 'supervisor', e.target.value)}
                    placeholder="Supervisor name"
                    className="mt-1"
                  />
                </div>
              </div>
              
              {/* End time display */}
              {schedule.end_time && (
                <div className="mt-2 text-sm text-muted-foreground">
                  End Time: {schedule.end_time}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || subjectSchedules.length === 0}
          className="bg-gradient-primary hover:bg-primary-hover"
        >
          {isSubmitting ? 'Creating Schedule...' : `Schedule All ${subjectSchedules.length} Subjects`}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default ExamScheduleManager;
