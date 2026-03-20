import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Eye,
  FileText,
  Download
} from "lucide-react";
import axios from 'axios';

interface ExamEvent {
  id: number;
  name: string;
  department: string;
  semester: number;
}

interface EnrollmentApplication {
  id: number;
  exam_event_id: number;
  student_id: number;
  application_status: string;
  applied_at: string;
  student_name: string;
  roll_number: string;
  department: string;
  semester: number;
  selected_subjects: string;
  is_backlog_student: boolean;
  special_requirements: string | null;
  student_remarks: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_remarks: string | null;
  rejection_reason: string | null;
}

interface EnrollmentApplicationsManagerProps {
  examEvent: ExamEvent;
  adminEmail: string;
}

const EnrollmentApplicationsManager = ({ examEvent, adminEmail }: EnrollmentApplicationsManagerProps) => {
  const { toast } = useToast();
  const [applications, setApplications] = useState<EnrollmentApplication[]>([]);
  const [allApplications, setAllApplications] = useState<EnrollmentApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<EnrollmentApplication | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [examSchedules, setExamSchedules] = useState<any[]>([]);

  useEffect(() => {
    fetchAllApplications();
    fetchApplications();
    fetchExamSchedules();
  }, [examEvent.id, activeTab]);

  const fetchExamSchedules = async () => {
    try {
      const response = await axios.get(import.meta.env.VITE_API_URL + `/api/v1/exams/events/${examEvent.id}/schedules/`);
      setExamSchedules(response.data);
    } catch (error) {
      console.error('Error fetching exam schedules:', error);
    }
  };

  const fetchAllApplications = async () => {
    try {
      const response = await axios.get(
        `/api/v1/enrollment-applications/exam-event/${examEvent.id}/applications`
      );
      setAllApplications(response.data);
    } catch (error) {
      console.error('Error fetching all applications:', error);
    }
  };

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const status = activeTab === 'all' ? '' : activeTab;
      const response = await axios.get(
        `/api/v1/enrollment-applications/exam-event/${examEvent.id}/applications${status ? `?status=${status}` : ''}`
      );
      setApplications(response.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (applicationId: number) => {
    try {
      await axios.put(
        `/api/v1/enrollment-applications/application/${applicationId}/review?admin_email=${adminEmail}`,
        {
          application_status: 'APPROVED',
          admin_remarks: adminRemarks || null,
          rejection_reason: null
        }
      );

      toast({
        title: "Application approved",
        description: "Student has been enrolled for the exam",
      });

      fetchAllApplications();
      fetchApplications();
      setShowReviewDialog(false);
      setAdminRemarks('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to approve application",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (applicationId: number) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    try {
      await axios.put(
        `/api/v1/enrollment-applications/application/${applicationId}/review?admin_email=${adminEmail}`,
        {
          application_status: 'REJECTED',
          admin_remarks: adminRemarks || null,
          rejection_reason: rejectionReason
        }
      );

      toast({
        title: "Application rejected",
        description: "Student has been notified",
      });

      fetchAllApplications();
      fetchApplications();
      setShowReviewDialog(false);
      setAdminRemarks('');
      setRejectionReason('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to reject application",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (applicationId: number) => {
    if (!confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(import.meta.env.VITE_API_URL + `/api/v1/enrollment-applications/application/${applicationId}`);

      toast({
        title: "Application deleted",
        description: "The application has been removed",
      });

      fetchAllApplications();
      fetchApplications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to delete application",
        variant: "destructive",
      });
    }
  };

  const openReviewDialog = (application: EnrollmentApplication) => {
    setSelectedApplication(application);
    setShowReviewDialog(true);
    setAdminRemarks('');
    setRejectionReason('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-50 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-700"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  const parseSubjects = (subjectsJson: string) => {
    try {
      return JSON.parse(subjectsJson);
    } catch {
      return [];
    }
  };

  const getSubjectDetails = (subjectId: number) => {
    const schedule = examSchedules.find(s => s.subject_id === subjectId);
    if (schedule && schedule.subject) {
      return `${schedule.subject.code} - ${schedule.subject.name}`;
    }
    return `Subject ID: ${subjectId}`;
  };

  const handleExportEligibleStudents = () => {
    const approvedApplications = allApplications.filter(a => a.application_status === 'APPROVED');
    
    if (approvedApplications.length === 0) {
      toast({
        title: "No Approved Students",
        description: "There are no approved students to export",
        variant: "destructive"
      });
      return;
    }

    // Create CSV header with just Roll Number, Student Name, and Subjects Enrolled
    const header = ['Roll Number', 'Student Name', 'Subjects Enrolled'];
    
    // Create CSV rows
    const rows = approvedApplications.map(app => {
      const subjects = parseSubjects(app.selected_subjects);
      const subjectCodes = subjects.map((subId: number) => {
        const schedule = examSchedules.find(s => s.subject_id === subId);
        return schedule?.subject?.code || `Subject ${subId}`;
      }).join('; ');
      
      return [
        app.roll_number,
        app.student_name,
        subjectCodes
      ];
    });
    
    // Combine header and rows
    const csvContent = [header, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    // Create filename with event, dept, and semester
    const filename = `${examEvent.name}_${examEvent.department.replace(/\s+/g, '_')}_Sem${examEvent.semester}.csv`;
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "✅ Export Successful",
      description: `Exported ${approvedApplications.length} eligible students`,
    });
  };

  const pendingCount = allApplications.filter(a => a.application_status === 'PENDING').length;
  const approvedCount = allApplications.filter(a => a.application_status === 'APPROVED').length;
  const rejectedCount = allApplications.filter(a => a.application_status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Student Enrollment Applications
              </CardTitle>
              <CardDescription>
                Review and manage student applications for {examEvent.name}
              </CardDescription>
            </div>
            {approvedCount > 0 && (
              <Button onClick={handleExportEligibleStudents} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Eligible Students ({approvedCount})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">
                Pending ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({approvedCount})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({rejectedCount})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({allApplications.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="text-center py-8">Loading applications...</div>
              ) : applications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No {activeTab !== 'all' ? activeTab : ''} applications found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((application) => (
                    <Card key={application.id} className="border-l-4 border-l-primary">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">{application.student_name}</h3>
                              {getStatusBadge(application.application_status)}
                              {application.is_backlog_student && (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700">Backlog</Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-muted-foreground">
                              <div>
                                <span className="font-medium">Roll No:</span> {application.roll_number}
                              </div>
                              <div>
                                <span className="font-medium">Department:</span> {application.department}
                              </div>
                              <div>
                                <span className="font-medium">Semester:</span> {application.semester}
                              </div>
                              <div>
                                <span className="font-medium">Applied:</span> {new Date(application.applied_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {application.special_requirements && (
                          <div className="mb-3 p-3 bg-blue-50 rounded-lg text-sm">
                            <span className="font-medium">Special Requirements:</span> {application.special_requirements}
                          </div>
                        )}

                        {application.student_remarks && (
                          <div className="mb-3 p-3 bg-gray-50 rounded-lg text-sm">
                            <span className="font-medium">Student Remarks:</span> {application.student_remarks}
                          </div>
                        )}

                        {application.application_status === 'REJECTED' && application.rejection_reason && (
                          <div className="mb-3 p-3 bg-red-50 rounded-lg text-sm text-red-800">
                            <span className="font-medium">Rejection Reason:</span> {application.rejection_reason}
                          </div>
                        )}

                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReviewDialog(application)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>

                          {application.application_status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  setSelectedApplication(application);
                                  handleApprove(application.id);
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openReviewDialog(application)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-auto"
                            onClick={() => handleDelete(application.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Application</DialogTitle>
            <DialogDescription>
              {selectedApplication?.student_name} - {selectedApplication?.roll_number}
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Department:</span> {selectedApplication.department}
                </div>
                <div>
                  <span className="font-medium">Semester:</span> {selectedApplication.semester}
                </div>
                <div>
                  <span className="font-medium">Applied On:</span> {new Date(selectedApplication.applied_at).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {getStatusBadge(selectedApplication.application_status)}
                </div>
              </div>

              <div>
                <span className="font-medium text-sm">Selected Subjects:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {parseSubjects(selectedApplication.selected_subjects).map((subjectId: number) => (
                    <Badge key={subjectId} variant="secondary">{getSubjectDetails(subjectId)}</Badge>
                  ))}
                </div>
              </div>

              {selectedApplication.special_requirements && (
                <div>
                  <span className="font-medium text-sm">Special Requirements:</span>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedApplication.special_requirements}</p>
                </div>
              )}

              {selectedApplication.student_remarks && (
                <div>
                  <span className="font-medium text-sm">Student Remarks:</span>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedApplication.student_remarks}</p>
                </div>
              )}

              <div>
                <Label htmlFor="admin-remarks">Admin Remarks (Optional)</Label>
                <Textarea
                  id="admin-remarks"
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  placeholder="Add any remarks..."
                  rows={2}
                />
              </div>

              {selectedApplication.application_status === 'pending' && (
                <>
                  <div>
                    <Label htmlFor="rejection-reason">Rejection Reason (Required for rejection)</Label>
                    <Textarea
                      id="rejection-reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Provide reason if rejecting..."
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApprove(selectedApplication.id)}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Application
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(selectedApplication.id)}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Application
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnrollmentApplicationsManager;
