import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import StudentEntryForm from '@/components/StudentEntryForm';
import StudentList from '@/components/StudentList';
import SubjectMaster from '@/components/SubjectMaster';
import BulkUpload from '@/components/BulkUpload';
import ExaminationManagement from '@/components/ExaminationManagement';
import ClubManagement from '@/components/ClubManagement';
import EventManagement from '@/components/EventManagement';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('students');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleStudentAdded = () => {
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('students');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'add-student':
        return (
          <div className="space-y-8">
            <StudentEntryForm onStudentAdded={handleStudentAdded} />
            <BulkUpload onStudentsUploaded={handleStudentAdded} />
          </div>
        );
      case 'subjects':
        return <SubjectMaster />;
      case 'examinations':
        return <ExaminationManagement />;
      case 'clubs':
        return <ClubManagement />;
      case 'events':
        return <EventManagement />;
      case 'students':
      default:
        return <StudentList key={refreshTrigger} />;
    }
  };

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  );
};

export default AdminDashboard;