import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  Clock, 
  Users, 
  BookOpen, 
  FileText, 
  CheckCircle, 
  Plus, 
  Settings,
  AlertCircle,
  Edit,
  Trash2
} from "lucide-react";
import ExamEventForm from './ExamEventForm';
import ExamDashboard from './ExamDashboard';
import ExamScheduleManager from './ExamScheduleManager';
import EnrollmentApplicationsManager from './EnrollmentApplicationsManager';
import ComponentMarksEntrySimple from './ComponentMarksEntrySimple';
import ResultsManager from './ResultsManager';

interface ExamEvent {
  id: number;
  name: string;
  description?: string;
  exam_type: string;
  status: string;
  department: string;
  semester: number;
  academic_year: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

const ExaminationManagement = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('events');
  const [examEvents, setExamEvents] = useState<ExamEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ExamEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);

  useEffect(() => {
    fetchExamEvents();
  }, []);

  const fetchExamEvents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/v1/exams/events/');
      if (response.ok) {
        const events = await response.json();
        setExamEvents(events);
      } else {
        throw new Error('Failed to fetch exam events');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load exam events",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEventCreated = (newEvent: ExamEvent) => {
    setExamEvents(prev => [newEvent, ...prev]);
    setShowEventForm(false);
    toast({
      title: "Success",
      description: "Exam event created successfully",
    });
  };

  const handleEventSelect = (event: ExamEvent) => {
    setSelectedEvent(event);
    setActiveTab('schedule');
  };

  const handleEditEvent = (event: ExamEvent) => {
    setSelectedEvent(event);
    setShowEventForm(true);
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm('Are you sure you want to delete this exam event? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(import.meta.env.VITE_API_URL + `/api/v1/exams/events/${eventId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Exam event deleted successfully",
        });
        fetchExamEvents(); // Refresh the list
        if (selectedEvent?.id === eventId) {
          setSelectedEvent(null);
          setActiveTab('events');
        }
      } else {
        throw new Error('Failed to delete exam event');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete exam event",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getExamTypeDisplay = (type: string) => {
    // Since we now use full names, just return the type as is
    return type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Examination Management</h2>
          <p className="text-muted-foreground">Manage exam events, schedules, and student enrollments</p>
        </div>
        <Button 
          onClick={() => setShowEventForm(true)}
          className="bg-gradient-primary hover:bg-primary-hover"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Exam Event
        </Button>
      </div>

      {/* Event Creation Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <ExamEventForm 
              onEventCreated={handleEventCreated}
              onCancel={() => {
                setShowEventForm(false);
                setSelectedEvent(null);
              }}
              editingEvent={selectedEvent}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
          <TabsTrigger value="marks">Marks Entry</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>


        {/* Events Tab */}
        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Exam Events
              </CardTitle>
              <CardDescription>
                Manage exam events and their configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : examEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Exam Events</h3>
                  <p className="text-muted-foreground mb-4">Create your first exam event to get started</p>
                  <Button onClick={() => setShowEventForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Exam Event
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {examEvents.map((event) => (
                    <Card 
                      key={event.id} 
                      className="cursor-pointer hover:shadow-hover transition-all duration-300 hover:-translate-y-1"
                      onClick={() => handleEventSelect(event)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-1">{event.name}</CardTitle>
                            <CardDescription className="text-sm">
                              {event.department} • Semester {event.semester}
                            </CardDescription>
                          </div>
                          <Badge className={getStatusColor(event.status)}>
                            {event.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <BookOpen className="h-4 w-4" />
                            {getExamTypeDisplay(event.exam_type)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Settings className="h-4 w-4" />
                            Academic Year {event.academic_year}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            className="flex-1" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventSelect(event);
                            }}
                          >
                            Manage Event
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditEvent(event);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(event.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          {selectedEvent ? (
            <ExamScheduleManager 
              examEvent={selectedEvent} 
              onNavigateToEnrollment={() => setActiveTab('enrollment')}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Event Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Please select an exam event from the Events tab to manage its schedule
                </p>
                <Button onClick={() => setActiveTab('events')}>
                  Go to Events
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Enrollment Tab */}
        <TabsContent value="enrollment">
          {selectedEvent ? (
            <EnrollmentApplicationsManager 
              examEvent={selectedEvent} 
              adminEmail="admin@scoe.edu.in"
            />
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Event Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Please select an exam event to manage student enrollments
                </p>
                <Button onClick={() => setActiveTab('events')}>
                  Go to Events
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Marks Entry Tab */}
        <TabsContent value="marks">
          {selectedEvent ? (
            <ComponentMarksEntrySimple examEvent={selectedEvent} />
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Event Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Please select an exam event to enter marks
                </p>
                <Button onClick={() => setActiveTab('events')}>
                  Go to Events
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results">
          <ResultsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExaminationManagement;
