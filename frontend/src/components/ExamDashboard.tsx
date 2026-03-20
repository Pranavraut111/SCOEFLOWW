import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  FileText,
  BarChart3
} from "lucide-react";

interface DashboardData {
  upcoming_exams: any[];
  ongoing_exams: any[];
  recent_results: any[];
  pending_marks_entry: number;
  total_students_enrolled: number;
  exam_statistics: any;
}

const ExamDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/v1/exams/dashboard');
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const data = dashboardData || {
    upcoming_exams: [],
    ongoing_exams: [],
    recent_results: [],
    pending_marks_entry: 0,
    total_students_enrolled: 0,
    exam_statistics: {}
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Exams</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.upcoming_exams.length}</div>
            <p className="text-xs text-muted-foreground">
              Next 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ongoing Exams</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.ongoing_exams.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enrolled</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_students_enrolled}</div>
            <p className="text-xs text-muted-foreground">
              Students in active exams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Marks</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pending_marks_entry}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting entry
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Exams */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Exams
            </CardTitle>
            <CardDescription>
              Exams scheduled for the next 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.upcoming_exams.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No upcoming exams</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.upcoming_exams.slice(0, 5).map((exam: any) => (
                  <div key={exam.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <h4 className="font-medium">{exam.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {exam.department} • Semester {exam.semester}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(exam.start_date).toLocaleDateString()} - {new Date(exam.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {exam.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ongoing Exams */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Ongoing Exams
            </CardTitle>
            <CardDescription>
              Currently active examination events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.ongoing_exams.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No ongoing exams</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.ongoing_exams.map((exam: any) => (
                  <div key={exam.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <h4 className="font-medium">{exam.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {exam.department} • Semester {exam.semester}
                      </p>
                      <p className="text-xs text-green-600 font-medium">
                        In Progress
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className="bg-green-100 text-green-800">
                        {exam.status}
                      </Badge>
                      <Button size="sm" variant="outline">
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Recent Results
          </CardTitle>
          <CardDescription>
            Latest exam results and statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recent_results.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent results available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recent_results.slice(0, 5).map((result: any) => (
                <div key={result.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <h4 className="font-medium">Student ID: {result.student_id}</h4>
                    <p className="text-sm text-muted-foreground">
                      Event ID: {result.exam_event_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {result.subjects_passed}/{result.total_subjects} subjects passed
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{result.percentage.toFixed(1)}%</div>
                    <Badge className={result.is_promoted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {result.overall_grade}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default ExamDashboard;
