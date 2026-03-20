import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Bell, Calendar, FileText, CheckCircle, XCircle, Clock, Send, BookOpen, MapPin } from "lucide-react";
import axios from 'axios';

interface ExamNotification {
  id: number;
  name: string;
  description: string;
  exam_type: string;
  status: string;
  department: string;
  semester: number;
  academic_year: string;
  start_date: string;
  end_date: string;
  instructions: string;
  has_applied: boolean;
  application_status: string | null;
}

interface ExamSchedule {
  id: number;
  subject_id: number;
  exam_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  total_marks: number;
  duration_minutes: number;
  subject: {
    id: number;
    name: string;
    code: string;
  };
}

interface ExamNotificationsProps {
  studentId: string | number;
  studentName: string;
  rollNumber: string;
  department: string;
  semester: number;
}

const ExamNotifications = ({ studentId, studentName, rollNumber, department, semester }: ExamNotificationsProps) => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<ExamNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamNotification | null>(null);
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [isBacklogStudent, setIsBacklogStudent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [studentId]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(import.meta.env.VITE_API_URL + `/api/v1/enrollment-applications/student/${studentId}/notifications`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExamSchedules = async (examEventId: number) => {
    setLoadingSchedules(true);
    try {
      console.log('Fetching schedules for exam event:', examEventId);
      const response = await axios.get(import.meta.env.VITE_API_URL + `/api/v1/exams/events/${examEventId}/schedules/`);
      console.log('Schedules response:', response.data);
      setExamSchedules(response.data);
    } catch (error: any) {
      console.error('Error fetching exam schedules:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to load exam subjects",
        variant: "destructive",
      });
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleApplyClick = async (exam: ExamNotification) => {
    console.log('Selected exam notification:', exam);
    setSelectedExam(exam);
    setSelectedSubjects([]);
    setIsBacklogStudent(false);
    await fetchExamSchedules(exam.id);
    setShowApplicationForm(true);
  };

  const handleSubjectToggle = (subjectId: number) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSubjects.length === examSchedules.length) {
      setSelectedSubjects([]);
    } else {
      setSelectedSubjects(examSchedules.map(schedule => schedule.subject_id));
    }
  };

  const handleSubmitApplication = async () => {
    if (selectedSubjects.length === 0) {
      toast({
        title: "No subjects selected",
        description: "Please select at least one subject to enroll",
        variant: "destructive",
      });
      return;
    }

    const applicationData = {
      exam_event_id: selectedExam?.id,
      student_name: studentName,
      roll_number: rollNumber,
      department: department,
      semester: semester,
      selected_subjects: selectedSubjects,
      is_backlog_student: isBacklogStudent,
      special_requirements: null,
      student_remarks: null,
    };

    console.log('Submitting application:', applicationData);

    setSubmitting(true);
    try {
      const response = await axios.post(import.meta.env.VITE_API_URL + `/api/v1/enrollment-applications/apply?student_id=${studentId}`, applicationData);
      console.log('Application response:', response.data);

      toast({
        title: "Application submitted successfully!",
        description: "Your enrollment application has been submitted for admin review",
      });

      setShowApplicationForm(false);
      fetchNotifications(); // Refresh to show updated status
    } catch (error: any) {
      console.error('Application error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      toast({
        title: "Application failed",
        description: error.response?.data?.detail || "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (notification: ExamNotification) => {
    if (!notification.has_applied) {
      return <Badge variant="outline" className="bg-blue-50">Not Applied</Badge>;
    }
    
    switch (notification.application_status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Enrolled</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading notifications...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Exam Notifications
          </CardTitle>
          <CardDescription>
            Exam events for {department} - Semester {semester}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No exam notifications at this time</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card key={notification.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{notification.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{notification.description}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant="secondary">{notification.exam_type}</Badge>
                          <Badge variant="outline">{notification.academic_year}</Badge>
                          {getStatusBadge(notification)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(notification.start_date).toLocaleDateString()} - {new Date(notification.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {!notification.has_applied && (
                      <Button 
                        onClick={() => handleApplyClick(notification)}
                        className="w-full"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Apply for Exam Enrollment
                      </Button>
                    )}

                    {notification.has_applied && notification.application_status === 'PENDING' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                        ⏳ Your application is under review by the admin
                      </div>
                    )}

                    {notification.application_status === 'APPROVED' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                        ✓ Your application has been approved. You are enrolled for this exam.
                      </div>
                    )}

                    {notification.application_status === 'REJECTED' && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                        ✗ Your application was rejected. Please contact the examination office for details.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Professional Enrollment Application Form */}
      <Dialog open={showApplicationForm} onOpenChange={setShowApplicationForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Examination Enrollment Form</DialogTitle>
            <DialogDescription>
              {selectedExam?.name} - {selectedExam?.academic_year}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Student Information Section */}
            <div className="bg-gradient-card p-4 rounded-lg border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Student Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Full Name</Label>
                  <p className="font-medium">{studentName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Roll Number</Label>
                  <p className="font-medium">{rollNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Department</Label>
                  <p className="font-medium">{department}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Semester</Label>
                  <p className="font-medium">Semester {semester}</p>
                </div>
              </div>
            </div>

            {/* Subject Selection Section */}
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Select Subjects for Enrollment *
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedSubjects.length === examSchedules.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {loadingSchedules ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading exam schedule...
                </div>
              ) : examSchedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No subjects scheduled for this exam yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {examSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={`border rounded-lg p-4 transition-all cursor-pointer hover:border-primary ${
                        selectedSubjects.includes(schedule.subject_id) ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => handleSubjectToggle(schedule.subject_id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`subject-${schedule.subject_id}`}
                          checked={selectedSubjects.includes(schedule.subject_id)}
                          onCheckedChange={() => handleSubjectToggle(schedule.subject_id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-base">
                                {schedule.subject?.code || 'N/A'} - {schedule.subject?.name || 'Subject'}
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(schedule.exam_date).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {schedule.start_time} - {schedule.end_time}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {schedule.duration_minutes} mins
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {schedule.venue || 'TBA'}
                                </div>
                              </div>
                            </div>
                            <Badge variant="secondary">{schedule.total_marks} Marks</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-3">
                ✓ Selected: {selectedSubjects.length} of {examSchedules.length} subject(s)
              </p>
            </div>

            {/* Backlog Student Checkbox */}
            <div className="flex items-center space-x-2 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <Checkbox
                id="backlog"
                checked={isBacklogStudent}
                onCheckedChange={(checked) => setIsBacklogStudent(checked as boolean)}
              />
              <label
                htmlFor="backlog"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I am a backlog student (appearing for KT/ATKT subjects)
              </label>
            </div>

            {/* Declaration */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="font-semibold mb-2">Declaration:</p>
              <p className="text-muted-foreground">
                I hereby declare that the information provided above is correct to the best of my knowledge. 
                I understand that my enrollment is subject to admin approval and I will be notified of the decision.
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleSubmitApplication}
                disabled={submitting || selectedSubjects.length === 0}
                className="flex-1"
                size="lg"
              >
                {submitting ? "Submitting..." : "Submit Enrollment Application"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowApplicationForm(false)}
                disabled={submitting}
                size="lg"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExamNotifications;
