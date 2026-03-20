import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Student } from '@/types/student';
import {
  GraduationCap, User, Mail, Phone, MapPin, Calendar, BookOpen, ArrowLeft,
  Home, Lock, Eye, EyeOff, LogOut, Key, Download, Bell, Award,
  ChevronLeft, ChevronRight, CheckCircle,
  Send, Bot, Loader2, Building2, MessageSquare, Navigation, UserCircle, Lightbulb,
  Star, Landmark, Users, Trophy, Users2, CalendarDays, UserPlus, Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import ExamNotifications from './ExamNotifications';
import ClubFrameAnimation from './ClubFrameAnimation';

// ========== ONBOARDING ==========
const ONBOARDING_STEPS = [
  {
    id: 'academic_interest',
    title: 'How do you feel about academics?',
    subtitle: 'Be honest, there is no wrong answer!',
    type: 'single' as const,
    options: [
      { value: 'high', label: 'Love it!', desc: 'I enjoy studying and aim for top grades', icon: '\u{1F3AF}' },
      { value: 'moderate', label: 'Its okay', desc: 'I study when needed, balance with fun', icon: '\u2696\uFE0F' },
      { value: 'low', label: 'Not my thing', desc: 'I prefer practical learning over theory', icon: '\u{1F527}' },
    ]
  },
  {
    id: 'favorite_subjects',
    title: 'What subjects excite you?',
    subtitle: 'Select all that apply',
    type: 'multi' as const,
    options: [
      { value: 'programming', label: 'Programming & Coding', icon: '\u{1F4BB}' },
      { value: 'math', label: 'Mathematics', icon: '\u{1F4D0}' },
      { value: 'electronics', label: 'Electronics & Hardware', icon: '\u{1F50C}' },
      { value: 'networks', label: 'Networking & Security', icon: '\u{1F310}' },
      { value: 'ai_ml', label: 'AI / Machine Learning', icon: '\u{1F916}' },
      { value: 'design', label: 'Design & Creativity', icon: '\u{1F3A8}' },
      { value: 'communication', label: 'Communication Skills', icon: '\u{1F3A4}' },
      { value: 'management', label: 'Management & Leadership', icon: '\u{1F4CB}' },
    ]
  },
  {
    id: 'sports_interest',
    title: 'How active are you in sports?',
    subtitle: 'Physical activities and fitness',
    type: 'single' as const,
    options: [
      { value: 'very_active', label: 'Super Active', desc: 'I play sports regularly', icon: '\u{1F3C6}' },
      { value: 'moderate', label: 'Sometimes', desc: 'I play casually with friends', icon: '\u{1F3BE}' },
      { value: 'fitness', label: 'Fitness Only', desc: 'Gym/yoga but not competitive sports', icon: '\u{1F3CB}\uFE0F' },
      { value: 'not_interested', label: 'Not into sports', desc: 'I prefer other activities', icon: '\u{1F4D6}' },
    ]
  },
  {
    id: 'clubs_interested',
    title: 'What clubs interest you?',
    subtitle: 'Select the ones you would like to join',
    type: 'multi' as const,
    options: [
      { value: 'nss', label: 'NSS (National Service Scheme)', icon: '\u{1F1EE}\u{1F1F3}' },
      { value: 'rotaract', label: 'Rotaract Club', icon: '\u{1F91D}' },
      { value: 'student_council', label: 'Student Council', icon: '\u{1F3DB}\uFE0F' },
      { value: 'coding_club', label: 'Coding / Tech Club', icon: '\u{1F4BB}' },
      { value: 'cultural', label: 'Cultural Committee', icon: '\u{1F3AD}' },
      { value: 'entrepreneurship', label: 'E-Cell / Startup Club', icon: '\u{1F680}' },
    ]
  },
  {
    id: 'learning_style',
    title: 'How do you learn best?',
    subtitle: 'Your preferred learning style',
    type: 'single' as const,
    options: [
      { value: 'visual', label: 'Visual Learner', desc: 'Videos, diagrams, and charts', icon: '\u{1F440}' },
      { value: 'reading', label: 'Reading & Writing', desc: 'Notes, books, and documentation', icon: '\u{1F4DD}' },
      { value: 'hands_on', label: 'Hands-on / Practical', desc: 'Building projects and experiments', icon: '\u{1F6E0}\uFE0F' },
      { value: 'discussion', label: 'Discussion & Group Study', desc: 'Learning through talking', icon: '\u{1F4AC}' },
    ]
  },
  {
    id: 'social_preference',
    title: 'How would you describe yourself socially?',
    subtitle: 'No right or wrong here!',
    type: 'single' as const,
    options: [
      { value: 'introvert', label: 'Introvert', desc: 'I prefer quiet, solo time', icon: '\u{1F319}' },
      { value: 'ambivert', label: 'Ambivert', desc: 'A mix of both depending on mood', icon: '\u{1F324}\uFE0F' },
      { value: 'extrovert', label: 'Extrovert', desc: 'I love socializing and group activities', icon: '\u2600\uFE0F' },
    ]
  },
  {
    id: 'career_goal',
    title: 'What is your career dream?',
    subtitle: 'Type your goal or aspiration',
    type: 'text' as const,
    placeholder: 'e.g. Software Engineer at Google, Start my own company, Research in AI...',
  },
];

// ========== SIDEBAR NAV ITEMS ==========
const NAV_ITEMS = [
  { id: 'college', label: 'Know Your College', icon: Building2 },
  { id: 'clubs', label: 'Join Clubs', icon: Users2 },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'chat', label: 'AI Chat', icon: MessageSquare },
  { id: 'recommendations', label: 'AI Recommendations', icon: Lightbulb },
  { id: 'navigation', label: 'Campus Navigation', icon: Navigation },
  { id: 'profile', label: 'Profile', icon: UserCircle },
];

// ========== FLOOR DATA ==========
const FLOORS = [
  { id: 'ground', name: 'Ground Floor', image: '/college/floor_ground.jpeg', desc: 'Main Entrance, Reception, Administrative Office, Accounts, Principal Office, Canteen, Parking, Security, Examination Cell' },
  { id: 'first', name: 'First Floor', image: '/college/floor_first.jpeg', desc: 'Mechanical Engineering Dept, Automobile Engineering Dept, ME/AE Labs (Workshop, Thermodynamics, Fluid Mechanics), Drawing Hall, Seminar Hall 1' },
  { id: 'second', name: 'Second Floor', image: '/college/floor_second.jpeg', desc: 'Computer Engineering Dept (HOD Office, Faculty), CE Computer Labs (Lab 1, 2, 3), Information Technology Dept, IT Labs, Dept Library' },
  { id: 'third', name: 'Third Floor', image: '/college/floor_third.jpeg', desc: 'CSE (AI & ML) Dept, Data Science Dept, AI/ML Labs, Research Lab, Project Lab, Seminar Hall 2, Smart Classroom' },
  { id: 'fourth', name: 'Fourth Floor', image: '/college/floor_fourth.jpeg', desc: 'Civil Engineering Dept, Civil Labs (Surveying, Material Testing, Concrete), Environmental Engg Lab, Conference Room' },
  { id: 'fifth', name: 'Fifth Floor', image: '/college/floor_fifth.jpeg', desc: 'Main Library (with digital section), Reading Room, Faculty Development Center, Server Room, Terrace Garden / Open Study Area' },
];

const CLUBS = [
  { name: 'NSS (National Service Scheme)', image: '/college/nss.jpeg', frameId: 'nss' as const, desc: 'Community service, blood donation drives, village visits, social awareness campaigns. NSS empowers students to contribute to nation-building through social service.' },
  { name: 'Rotaract Club', image: '/college/rotaract.jpeg', frameId: 'rotaract' as const, desc: 'Leadership development, community projects, professional networking, and Rotary International events. Rotaract builds future leaders through service above self.' },
  { name: 'Student Council', image: '/college/studentcouncil.jpeg', frameId: 'studentcouncil' as const, desc: 'Student governance, cultural events, annual fest CRESCENDO, sports events, and student representation. The voice of every student on campus.' },
];

const COLLEGE_PHOTOS = [
  '/college/clg01.jpeg',
  '/college/clg02.jpeg',
  '/college/clg03.jpeg',
  '/college/clg04.jpeg',
];


const StudentPortal = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Sidebar + Sections
  const [activeSection, setActiveSection] = useState('college');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingAnswers, setOnboardingAnswers] = useState<Record<string, any>>({});
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);
  const [personalityProfile, setPersonalityProfile] = useState<any>(null);

  // AI Chat
  const [chatMessages, setChatMessages] = useState<Array<{role: string, text: string}>>([
    { role: 'bot', text: 'Hi! I am the SCOE Campus Assistant. Ask me anything about our college - locations, departments, clubs, facilities, or campus navigation!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Gallery
  const [activePhoto, setActivePhoto] = useState(0);
  const [activeFloor, setActiveFloor] = useState(0);

  // Results
  const [publishedResults, setPublishedResults] = useState<any[]>([]);

  // Clubs & Events
  const [allClubs, setAllClubs] = useState<any[]>([]);
  const [joinedClubIds, setJoinedClubIds] = useState<string[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [registeredEventIds, setRegisteredEventIds] = useState<string[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Recommendations
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Club Frame Animation
  const [activeClubAnimation, setActiveClubAnimation] = useState<'nss' | 'rotaract' | 'studentcouncil' | null>(null);

  useEffect(() => {
    if (student) {
      fetchPublishedResults();
      checkOnboarding();
      loadChatHistory();
    }
  }, [student]);

  const loadChatHistory = async () => {
    if (!student) return;
    try {
      const r = await axios.get(import.meta.env.VITE_API_URL + `/api/v1/chat/history/${student.id}`);
      if (r.data.messages && r.data.messages.length > 0) {
        const history = r.data.messages.map((m: any) => ({ role: m.role, text: m.text }));
        setChatMessages([{ role: 'bot', text: 'Hi! I am the SCOE Campus Assistant. Ask me anything about our college - locations, departments, clubs, facilities, or campus navigation!' }, ...history]);
      }
    } catch {}
  };

  const clearChatHistory = async () => {
    if (!student) return;
    try {
      await axios.delete(import.meta.env.VITE_API_URL + `/api/v1/chat/history/${student.id}`);
      setChatMessages([{ role: 'bot', text: 'Hi! I am the SCOE Campus Assistant. Ask me anything about our college - locations, departments, clubs, facilities, or campus navigation!' }]);
    } catch {}
  };

  const fetchRecommendations = async () => {
    if (!student || recommendations) return;
    setLoadingRecs(true);
    try {
      const r = await axios.get(import.meta.env.VITE_API_URL + `/api/v1/chat/recommendations/${student.id}`);
      if (r.data.recommendations) setRecommendations(r.data.recommendations);
    } catch {}
    finally { setLoadingRecs(false); }
  };

  useEffect(() => {
    if (activeSection === 'recommendations') fetchRecommendations();
    if (activeSection === 'clubs') fetchClubs();
    if (activeSection === 'events') fetchEvents();
  }, [activeSection]);

  const fetchClubs = async () => {
    if (!student) return;
    setLoadingClubs(true);
    try {
      const [clubsRes, joinedRes] = await Promise.all([
        axios.get(import.meta.env.VITE_API_URL + '/api/v1/campus/clubs'),
        axios.get(import.meta.env.VITE_API_URL + `/api/v1/campus/student/${student.id}/clubs`)
      ]);
      setAllClubs(clubsRes.data || []);
      setJoinedClubIds((joinedRes.data || []).map((c: any) => c.id));
    } catch {}
    finally { setLoadingClubs(false); }
  };

  const fetchEvents = async () => {
    if (!student) return;
    setLoadingEvents(true);
    try {
      const [eventsRes, regRes] = await Promise.all([
        axios.get(import.meta.env.VITE_API_URL + '/api/v1/campus/events'),
        axios.get(import.meta.env.VITE_API_URL + `/api/v1/campus/student/${student.id}/events`)
      ]);
      setAllEvents(eventsRes.data || []);
      setRegisteredEventIds((regRes.data || []).map((e: any) => e.id));
    } catch {}
    finally { setLoadingEvents(false); }
  };

  const handleJoinClub = async (clubId: string) => {
    if (!student) return;
    try {
      const res = await axios.post(import.meta.env.VITE_API_URL + `/api/v1/campus/clubs/${clubId}/join`, { student_id: student.id });
      if (res.data.already_joined) {
        toast({ title: 'Already Joined', description: 'You are already a member of this club.' });
      } else {
        toast({ title: 'Joined!', description: 'You have successfully joined this club.' });
      }
      setJoinedClubIds(prev => [...new Set([...prev, clubId])]);
      fetchClubs();
    } catch {
      toast({ title: 'Error', description: 'Failed to join club.', variant: 'destructive' });
    }
  };

  const handleLeaveClub = async (clubId: string) => {
    if (!student) return;
    try {
      await axios.post(import.meta.env.VITE_API_URL + `/api/v1/campus/clubs/${clubId}/leave`, { student_id: student.id });
      toast({ title: 'Left Club', description: 'You have left this club.' });
      setJoinedClubIds(prev => prev.filter(id => id !== clubId));
      fetchClubs();
    } catch {
      toast({ title: 'Error', description: 'Failed to leave club.', variant: 'destructive' });
    }
  };

  const handleAttendEvent = async (eventId: string) => {
    if (!student) return;
    try {
      const res = await axios.post(import.meta.env.VITE_API_URL + `/api/v1/campus/events/${eventId}/attend`, { student_id: student.id });
      if (res.data.already_attended) {
        toast({ title: 'Already Registered', description: 'You are already registered for this event.' });
      } else {
        toast({ title: 'Registered!', description: 'You have successfully registered for this event.' });
      }
      setRegisteredEventIds(prev => [...new Set([...prev, eventId])]);
      fetchEvents();
    } catch {
      toast({ title: 'Error', description: 'Failed to register for event.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Auto-advance gallery
  useEffect(() => {
    const timer = setInterval(() => {
      setActivePhoto(p => (p + 1) % COLLEGE_PHOTOS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const checkOnboarding = async () => {
    if (!student) return;
    try {
      const r = await axios.get(import.meta.env.VITE_API_URL + `/api/v1/students/personality/${student.id}`);
      if (r.data.has_completed_onboarding) {
        setHasCompletedOnboarding(true);
        setPersonalityProfile(r.data);
      } else {
        setHasCompletedOnboarding(false);
        setShowOnboarding(true);
      }
    } catch {
      setHasCompletedOnboarding(false);
      setShowOnboarding(true);
    }
  };

  const fetchPublishedResults = async () => {
    if (!student) return;
    try {
      const r = await axios.get(import.meta.env.VITE_API_URL + `/api/v1/results/student/${student.id}/published`);
      setPublishedResults(r.data || []);
    } catch {}
  };

  const handleOnboardingAnswer = (qid: string, val: any) => {
    setOnboardingAnswers(prev => ({ ...prev, [qid]: val }));
  };

  const handleMultiToggle = (qid: string, val: string) => {
    setOnboardingAnswers(prev => {
      const curr = prev[qid] || [];
      return { ...prev, [qid]: curr.includes(val) ? curr.filter((v: string) => v !== val) : [...curr, val] };
    });
  };

  const handleSubmitOnboarding = async () => {
    if (!student) return;
    setIsLoading(true);
    try {
      await axios.post(import.meta.env.VITE_API_URL + `/api/v1/students/personality/${student.id}`, onboardingAnswers);
      setHasCompletedOnboarding(true);
      setShowOnboarding(false);
      setPersonalityProfile(onboardingAnswers);
      toast({ title: 'Profile saved!', description: 'Your personality profile has been saved.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save. Try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !student || isSending) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIsSending(true);
    try {
      const r = await axios.post(import.meta.env.VITE_API_URL + '/api/v1/chat/ask', {
        student_id: student.id,
        message: msg
      });
      setChatMessages(prev => [...prev, { role: 'bot', text: r.data.response }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I could not process that. Please try again.' }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadResult = async () => {
    if (!student) return;
    try {
      setIsLoading(true);
      const response = await axios.get(import.meta.env.VITE_API_URL + `/api/v1/results/detailed-result-sheet/${student.id}?academic_year=2025-26&semester=${student.current_semester || 2}`);
      if (response.data?.subjects) {
        const data = response.data; const subjects = data.subjects; const summary = data.semester_summary;
        const rows: any[] = [['Roll','Name','Code','Subject','Credits','IA','Viva','ESE','Total','%','Grade','Status','SGPA','CGPA','Class']];
        subjects.forEach((s: any, i: number) => {
          rows.push([i===0?data.student.roll_number:'',i===0?data.student.name:'',s.subject_code,s.subject_name,s.credits,
            s.components?.IA?.marks_obtained||'-',s.components?.OR?.marks_obtained||'-',s.components?.ESE?.marks_obtained||'-',
            `${s.total_marks_obtained}/${s.total_max_marks}`,s.percentage?.toFixed(1)+'%',s.grade,s.is_pass?'Pass':'Fail',
            i===0?summary.sgpa?.toFixed(2):'',i===0?summary.cgpa?.toFixed(2):'',i===0?summary.result_class:'']);
        });
        const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob); const a = document.createElement('a');
        a.href = url; a.download = `${student.roll_number}_sem${student.current_semester||2}.csv`; a.click();
        window.URL.revokeObjectURL(url);
        toast({ title: 'Result Downloaded!' });
      } else { toast({ title: 'No Results', description: 'Not published yet', variant: 'destructive' }); }
    } catch { toast({ title: 'Download Failed', variant: 'destructive' }); }
    finally { setIsLoading(false); }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { toast({ title: 'Enter credentials', variant: 'destructive' }); return; }
    setIsLoading(true);
    try {
      const r = await axios.post(import.meta.env.VITE_API_URL + '/api/v1/students/auth/login', { institutional_email: email, password });
      if (r.data.student) { setStudent(r.data.student); toast({ title: `Welcome, ${r.data.student.first_name}!` }); }
    } catch (e: any) { toast({ title: 'Login failed', description: e.response?.data?.detail || 'Default: Student@123', variant: 'destructive' }); }
    finally { setIsLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) { toast({ title: 'All fields required', variant: 'destructive' }); return; }
    if (newPassword !== confirmPassword) { toast({ title: 'Passwords do not match', variant: 'destructive' }); return; }
    if (newPassword.length < 8) { toast({ title: 'Min 8 chars', variant: 'destructive' }); return; }
    try {
      await axios.post(import.meta.env.VITE_API_URL + `/api/v1/students/auth/change-password?student_id=${student?.id}`, { old_password: oldPassword, new_password: newPassword });
      toast({ title: 'Password changed!' }); setShowChangePassword(false); setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e: any) { toast({ title: 'Failed', description: e.response?.data?.detail, variant: 'destructive' }); }
  };

  const handleLogout = () => {
    setStudent(null); setEmail(''); setPassword(''); setShowPassword(false);
    setPublishedResults([]); setPersonalityProfile(null); setHasCompletedOnboarding(true);
    setChatMessages([{ role: 'bot', text: 'Hi! I am the SCOE Campus Assistant. Ask me anything!' }]);
    toast({ title: 'Logged out' });
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getYear = (s: number) => { const y = Math.ceil(s/2); return `${y}${['st','nd','rd','th'][Math.min(y-1,3)]} Year`; };

  // ========== LOGIN ==========
  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-2xl mb-4 backdrop-blur-sm border border-blue-500/20">
              <GraduationCap className="h-8 w-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">SCOEFLOW CONNECT</h1>
            <p className="text-blue-200/60 mt-1">Student Portal</p>
          </div>
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl text-white">Welcome Back</CardTitle>
              <CardDescription className="text-blue-200/50">Sign in to your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-blue-100/70 text-sm">Institutional Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your.email@cse.scoe.edu.in"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <div className="space-y-2">
                <Label className="text-blue-100/70 text-sm">Password</Label>
                <div className="relative">
                  <Input type={showPassword?"text":"password"} value={password} onChange={(e)=>setPassword(e.target.value)}
                    onKeyDown={(e)=>{if(e.key==='Enter')handleLogin()}} placeholder="Enter password"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 text-white/50 hover:text-white hover:bg-transparent"
                    onClick={()=>setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-white/30">Default: <code className="bg-white/10 px-1.5 py-0.5 rounded text-blue-300">Student@123</code></p>
              </div>
              <Button onClick={handleLogin} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white h-11">
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : <><Lock className="mr-2 h-4 w-4" />Sign In</>}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ========== ONBOARDING (one-time only) ==========
  if (showOnboarding && !hasCompletedOnboarding) {
    const q = ONBOARDING_STEPS[onboardingStep];
    const prog = ((onboardingStep + 1) / ONBOARDING_STEPS.length) * 100;
    const isLast = onboardingStep === ONBOARDING_STEPS.length - 1;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">Step {onboardingStep+1} / {ONBOARDING_STEPS.length}</span>
              <span className="text-sm font-medium text-blue-600">{Math.round(prog)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${prog}%` }} />
            </div>
          </div>
          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">{q.title}</CardTitle>
              <CardDescription className="text-base">{q.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {q.type === 'single' && (
                <div className="grid grid-cols-1 gap-3">
                  {q.options?.map(o => (
                    <button key={o.value} onClick={()=>handleOnboardingAnswer(q.id, o.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${onboardingAnswers[q.id]===o.value?'border-blue-500 bg-blue-50':'border-gray-200 hover:border-blue-200'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{o.icon}</span>
                        <div className="flex-1"><p className="font-semibold">{o.label}</p>{o.desc && <p className="text-sm text-muted-foreground">{o.desc}</p>}</div>
                        {onboardingAnswers[q.id]===o.value && <CheckCircle className="h-5 w-5 text-blue-500" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {q.type === 'multi' && (
                <div className="grid grid-cols-2 gap-3">
                  {q.options?.map(o => {
                    const sel = (onboardingAnswers[q.id]||[]).includes(o.value);
                    return (
                      <button key={o.value} onClick={()=>handleMultiToggle(q.id, o.value)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${sel?'border-blue-500 bg-blue-50':'border-gray-200 hover:border-blue-200'}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{o.icon}</span>
                          <span className="font-medium text-sm flex-1">{o.label}</span>
                          {sel && <CheckCircle className="h-4 w-4 text-blue-500" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {q.type === 'text' && (
                <Input value={onboardingAnswers[q.id]||''} onChange={e=>handleOnboardingAnswer(q.id,e.target.value)}
                  placeholder={q.placeholder} className="h-14 text-lg border-2" />
              )}
              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={()=>setOnboardingStep(s=>Math.max(0,s-1))} disabled={onboardingStep===0}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                {isLast ? (
                  <Button onClick={handleSubmitOnboarding} disabled={isLoading} className="bg-green-600 hover:bg-green-500 text-white px-8">
                    {isLoading ? 'Saving...' : 'Finish & Save'}
                  </Button>
                ) : (
                  <Button onClick={()=>setOnboardingStep(s=>s+1)} className="bg-blue-600 hover:bg-blue-500 px-8">
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ========== MAIN PORTAL ==========
  const sem = student.current_semester || 1;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ===== SIDEBAR ===== */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-slate-900 text-white flex flex-col transition-all duration-300 sticky top-0 h-screen z-40`}>
        {/* Logo */}
        <div className="p-4 flex items-center gap-2 border-b border-white/10">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold leading-tight">SCOEFLOW</h1>
              <p className="text-[9px] text-blue-300/60">Student Portal</p>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button key={item.id} onClick={()=>setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}>
                <Icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-2 border-t border-white/10 space-y-1">
          <button onClick={()=>setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-white">
            {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            {sidebarOpen && <span>Collapse</span>}
          </button>
          <button onClick={()=>setShowChangePassword(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-white">
            <Key className="h-5 w-5 shrink-0" />{sidebarOpen && <span>Password</span>}
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300">
            <LogOut className="h-5 w-5 shrink-0" />{sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 overflow-auto">
        {/* Top bar */}
        <header className="bg-white border-b sticky top-0 z-30 px-6 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{getGreeting()}, <span className="text-blue-600">{student.first_name}!</span></h2>
            <p className="text-xs text-muted-foreground">{student.department} &bull; Sem {sem} &bull; {getYear(sem)}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleDownloadResult} disabled={isLoading}>
              <Download className="h-3.5 w-3.5 mr-1.5" />Result
            </Button>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs">
              {student.first_name[0]}{student.last_name[0]}
            </div>
          </div>
        </header>

        <main className="p-6">
          {/* ===== KNOW YOUR COLLEGE ===== */}
          {activeSection === 'college' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Hero */}
              <div className="relative rounded-2xl overflow-hidden h-72 group">
                {COLLEGE_PHOTOS.map((photo, i) => (
                  <img key={i} src={photo} alt={`SCOE Campus ${i+1}`}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${i===activePhoto?'opacity-100':'opacity-0'}`} />
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <Badge className="bg-blue-600 mb-2">Est. 2004</Badge>
                  <h2 className="text-3xl font-bold mb-1">Saraswati College of Engineering</h2>
                  <p className="text-blue-100/80 text-sm">The Best Engineering College in Navi Mumbai</p>
                </div>
                {/* Gallery dots */}
                <div className="absolute bottom-4 right-6 flex gap-1.5">
                  {COLLEGE_PHOTOS.map((_, i) => (
                    <button key={i} onClick={()=>setActivePhoto(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i===activePhoto?'bg-white w-6':'bg-white/40'}`} />
                  ))}
                </div>
              </div>

              {/* About */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-blue-600" />About SCOE</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Welcome to <strong>Saraswati College of Engineering (SCOE)</strong>, the best engineering college in Navi Mumbai since 2004.
                    Our vision is to foster a knowledgeable society through leading-edge research and education. With spacious facilities
                    encompassing everything from classrooms to laboratories, SCOE is dedicated to providing top-tier engineering education.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                    {[
                      { label: 'Programs', value: '7+', icon: BookOpen },
                      { label: 'Since', value: '2004', icon: Calendar },
                      { label: 'Clubs', value: '3', icon: Users },
                      { label: 'Floors', value: '6', icon: Building2 },
                    ].map(s => (
                      <div key={s.label} className="text-center p-3 bg-blue-50 rounded-xl">
                        <s.icon className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                        <div className="text-xl font-bold text-blue-700">{s.value}</div>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Programs */}
              <Card className="bg-white">
                <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-green-600" />Programs Offered</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {['Computer Engineering', 'Computer Science & Engineering (AI & ML)', 'Data Science', 'Mechanical Engineering', 'Civil Engineering', 'Information Technology', 'Automobile Engineering'].map(p => (
                      <div key={p} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors">
                        <BookOpen className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="text-sm font-medium">{p}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Clubs */}
              <Card className="bg-white">
                <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-600" />Our Clubs</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {CLUBS.map(club => (
                      <div key={club.name} className="group text-center cursor-pointer" onClick={() => setActiveClubAnimation(club.frameId)}>
                        <div className="w-28 h-28 mx-auto mb-3 rounded-2xl overflow-hidden shadow-lg group-hover:shadow-xl group-hover:scale-110 transform transition-all duration-300 ring-2 ring-transparent group-hover:ring-blue-400">
                          <img src={club.image} alt={club.name} className="w-full h-full object-cover" />
                        </div>
                        <h4 className="font-semibold text-sm mb-1 group-hover:text-blue-600 transition-colors">{club.name}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{club.desc}</p>
                        <p className="text-[10px] text-blue-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to explore →</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Facilities */}
              <Card className="bg-white">
                <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-purple-600" />Campus Facilities</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      'Library & Digital Section', 'Canteen & Cafeteria', 'Sports Ground', 'Gymnasium',
                      'Campus-wide Wi-Fi', '60+ PC Labs', 'Seminar Halls', 'Parking',
                    ].map(f => (
                      <div key={f} className="p-3 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition-colors">
                        <p className="text-sm font-medium text-purple-800">{f}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ===== JOIN CLUBS ===== */}
          {activeSection === 'clubs' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2 mb-1"><Users2 className="h-5 w-5 text-blue-600" />Join Clubs</h3>
                <p className="text-sm text-muted-foreground">Explore and join clubs created by the administration.</p>
              </div>

              {loadingClubs && (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                  <p className="text-muted-foreground">Loading clubs...</p>
                </div>
              )}

              {!loadingClubs && allClubs.length === 0 && (
                <Card className="bg-white text-center py-12">
                  <CardContent>
                    <Users2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground">No clubs available yet. Check back later!</p>
                  </CardContent>
                </Card>
              )}

              {!loadingClubs && allClubs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {allClubs.map(club => {
                    const isJoined = joinedClubIds.includes(club.id);
                    return (
                      <Card key={club.id} className="bg-white overflow-hidden hover:shadow-lg transition-all duration-300 group">
                        {club.image_url && (
                          <div className="h-40 overflow-hidden">
                            <img src={club.image_url} alt={club.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </div>
                        )}
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{club.name}</CardTitle>
                              <Badge variant="secondary" className="mt-1 text-xs">{club.category}</Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              {club.member_count || 0}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{club.description}</p>
                          {isJoined ? (
                            <div className="flex gap-2">
                              <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Joined
                              </Badge>
                              <Button variant="outline" size="sm" className="ml-auto text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleLeaveClub(club.id)}>
                                Leave
                              </Button>
                            </div>
                          ) : (
                            <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white" onClick={() => handleJoinClub(club.id)}>
                              <UserPlus className="h-4 w-4 mr-2" /> Join Club
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== EVENTS ===== */}
          {activeSection === 'events' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2 mb-1"><CalendarDays className="h-5 w-5 text-purple-600" />Events</h3>
                <p className="text-sm text-muted-foreground">Explore upcoming events and register to attend.</p>
              </div>

              {loadingEvents && (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-purple-500 mb-4" />
                  <p className="text-muted-foreground">Loading events...</p>
                </div>
              )}

              {!loadingEvents && allEvents.length === 0 && (
                <Card className="bg-white text-center py-12">
                  <CardContent>
                    <CalendarDays className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground">No events scheduled yet. Check back later!</p>
                  </CardContent>
                </Card>
              )}

              {!loadingEvents && allEvents.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {allEvents.map(event => {
                    const isRegistered = registeredEventIds.includes(event.id);
                    return (
                      <Card key={event.id} className="bg-white overflow-hidden hover:shadow-lg transition-all duration-300 group">
                        {event.image_url && (
                          <div className="h-44 overflow-hidden">
                            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </div>
                        )}
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{event.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">{event.category}</Badge>
                                {event.club_name && <Badge className="bg-blue-100 text-blue-700 text-xs">{event.club_name}</Badge>}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{event.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
                            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{event.date}</span>
                            {event.time && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{event.time}</span>}
                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>
                            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{event.attendee_count || 0} attending</span>
                          </div>
                          {isRegistered ? (
                            <Badge className="bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                              <CheckCircle className="h-3 w-3" /> Registered
                            </Badge>
                          ) : (
                            <Button className="w-full bg-purple-600 hover:bg-purple-500 text-white" onClick={() => handleAttendEvent(event.id)}>
                              <CalendarDays className="h-4 w-4 mr-2" /> Register for Event
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== AI CHAT ===== */}
          {activeSection === 'chat' && (
            <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
              <Card className="bg-white h-[calc(100vh-10rem)] flex flex-col">
                <CardHeader className="border-b pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        SCOE AI Assistant
                      </CardTitle>
                      <CardDescription className="mt-1">Powered by Gemini 2.5 Flash | Ask about locations, departments, clubs, events</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={clearChatHistory} className="text-xs text-muted-foreground hover:text-red-500">
                      Clear Chat
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-4 space-y-4">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role==='user'?'justify-end':'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role==='user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      }`}>
                        {msg.role==='bot' && <Bot className="h-3.5 w-3.5 inline mr-1.5 text-blue-500" />}
                        <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
                      </div>
                    </div>
                  ))}
                  {isSending && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 p-3 rounded-2xl rounded-bl-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </CardContent>
                <div className="border-t p-3 flex gap-2">
                  <Input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter')handleSendChat()}}
                    placeholder="Ask me anything about SCOE..."
                    className="flex-1" disabled={isSending} />
                  <Button onClick={handleSendChat} disabled={isSending || !chatInput.trim()} size="sm" className="bg-blue-600 hover:bg-blue-500 px-4">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ===== AI RECOMMENDATIONS ===== */}
          {activeSection === 'recommendations' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" />AI Recommendations</h3>
                  <p className="text-sm text-muted-foreground">Personalized suggestions based on your onboarding profile</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setRecommendations(null); fetchRecommendations(); }} disabled={loadingRecs}>
                  {loadingRecs ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Regenerate
                </Button>
              </div>

              {loadingRecs && (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                  <p className="text-muted-foreground">Analyzing your profile with AI...</p>
                </div>
              )}

              {!loadingRecs && !recommendations && (
                <Card className="bg-white text-center py-12">
                  <CardContent>
                    <Lightbulb className="h-12 w-12 mx-auto mb-3 text-amber-400" />
                    <p className="text-muted-foreground">Complete the onboarding quiz to get personalized recommendations.</p>
                  </CardContent>
                </Card>
              )}

              {!loadingRecs && recommendations && (
                <div className="space-y-6">
                  {/* Club Recommendations */}
                  {recommendations.clubs && (
                    <Card className="bg-white">
                      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5 text-blue-600" />Clubs For You</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        {recommendations.clubs.map((c: any, i: number) => (
                          <div key={i} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold">{c.name}</h4>
                              <Badge className="bg-blue-100 text-blue-700">{c.match_score}% Match</Badge>
                            </div>
                            <div className="w-full h-2 bg-blue-200 rounded-full mb-2">
                              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700" style={{ width: `${c.match_score}%` }} />
                            </div>
                            <p className="text-sm text-muted-foreground">{c.reason}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Academic Tips */}
                  {recommendations.academic_tips && (
                    <Card className="bg-white">
                      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><BookOpen className="h-5 w-5 text-green-600" />Academic Tips</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {recommendations.academic_tips.map((tip: string, i: number) => (
                            <div key={i} className="flex gap-3 p-3 bg-green-50 rounded-lg">
                              <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                              <p className="text-sm">{tip}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Areas to Improve */}
                  {recommendations.improvements && (
                    <Card className="bg-white">
                      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Trophy className="h-5 w-5 text-orange-600" />Areas to Improve</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {recommendations.improvements.map((item: string, i: number) => (
                            <div key={i} className="flex gap-3 p-3 bg-orange-50 rounded-lg">
                              <Star className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                              <p className="text-sm">{item}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Career Steps */}
                  {recommendations.career_steps && (
                    <Card className="bg-white">
                      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><GraduationCap className="h-5 w-5 text-purple-600" />Career Roadmap</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {recommendations.career_steps.map((step: string, i: number) => (
                            <div key={i} className="flex gap-3 p-3 bg-purple-50 rounded-lg">
                              <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                              <p className="text-sm">{step}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Activity Suggestions */}
                  {recommendations.activity_suggestions && (
                    <Card className="bg-white">
                      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Award className="h-5 w-5 text-pink-600" />Activity Suggestions</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {recommendations.activity_suggestions.map((a: string, i: number) => (
                            <div key={i} className="p-3 bg-pink-50 rounded-lg text-sm hover:bg-pink-100 transition-colors">
                              {a}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== CAMPUS NAVIGATION ===== */}
          {activeSection === 'navigation' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div>
                <h3 className="text-xl font-bold mb-1">Campus Architecture</h3>
                <p className="text-sm text-muted-foreground">Explore our 6-floor campus building. Click on each floor to view its layout and departments.</p>
              </div>

              {/* Floor selector */}
              <div className="flex gap-2 flex-wrap">
                {FLOORS.map((f, i) => (
                  <Button key={f.id} variant={activeFloor===i?'default':'outline'} size="sm"
                    onClick={()=>setActiveFloor(i)} className={activeFloor===i?'bg-blue-600':''}>{f.name}</Button>
                ))}
              </div>

              {/* Active floor */}
              <Card className="bg-white overflow-hidden">
                <div className="md:flex">
                  <div className="md:w-1/2">
                    <img src={FLOORS[activeFloor].image} alt={FLOORS[activeFloor].name}
                      className="w-full h-64 md:h-full object-cover" />
                  </div>
                  <div className="md:w-1/2 p-6">
                    <Badge className="bg-blue-100 text-blue-700 mb-3">{FLOORS[activeFloor].name}</Badge>
                    <h3 className="text-lg font-bold mb-3">{FLOORS[activeFloor].name} Layout</h3>
                    <div className="space-y-2">
                      {FLOORS[activeFloor].desc.split(', ').map((item, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                          <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* All floors overview */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {FLOORS.map((f, i) => (
                  <Card key={f.id} className={`bg-white cursor-pointer hover:shadow-md transition-all ${activeFloor===i?'ring-2 ring-blue-500':''}`}
                    onClick={()=>setActiveFloor(i)}>
                    <div className="h-32 overflow-hidden rounded-t-lg">
                      <img src={f.image} alt={f.name} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                    </div>
                    <CardContent className="p-3">
                      <p className="font-semibold text-sm">{f.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{f.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ===== PROFILE ===== */}
          {activeSection === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Personal Info */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-blue-600" />Personal Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div><Label className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</Label>
                      <p className="font-medium mt-1">{student.first_name} {student.middle_name} {student.last_name}</p></div>
                    <div><Label className="text-xs text-muted-foreground uppercase tracking-wide">Mother Name</Label>
                      <p className="font-medium mt-1">{student.mother_name || '\u2014'}</p></div>
                    <div><Label className="text-xs text-muted-foreground uppercase tracking-wide">Date of Birth</Label>
                      <p className="font-medium mt-1 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />{student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '\u2014'}</p></div>
                    <div><Label className="text-xs text-muted-foreground uppercase tracking-wide">Gender</Label>
                      <p className="font-medium mt-1 capitalize">{student.gender || '\u2014'}</p></div>
                    <div><Label className="text-xs text-muted-foreground uppercase tracking-wide">Category</Label>
                      <Badge variant="secondary" className="mt-1">{student.category?.toUpperCase() || '\u2014'}</Badge></div>
                    <div><Label className="text-xs text-muted-foreground uppercase tracking-wide">Phone</Label>
                      <p className="font-medium mt-1 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{student.phone || '\u2014'}</p></div>
                  </div>
                  <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label className="text-xs text-muted-foreground uppercase tracking-wide">Address</Label>
                      <p className="font-medium mt-1 flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />{student.address || '\u2014'}</p></div>
                    <div><Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                      <p className="font-medium text-sm mt-1">{student.institutional_email || '\u2014'}</p>
                      <p className="text-xs text-muted-foreground">{student.email}</p></div>
                  </div>
                </CardContent>
              </Card>

              {/* Academic Info */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-green-600" />Academic Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-blue-50 rounded-xl text-center">
                      <p className="text-xs text-blue-600/70 uppercase mb-1">Department</p>
                      <p className="font-bold text-blue-800">{student.department}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl text-center">
                      <p className="text-xs text-green-600/70 uppercase mb-1">Current Semester</p>
                      <p className="text-3xl font-bold text-green-700">{sem}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl text-center">
                      <p className="text-xs text-purple-600/70 uppercase mb-1">Year</p>
                      <p className="text-lg font-bold text-purple-800">{getYear(sem)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {([['Roll Number', student.roll_number], ['Admission Number', student.admission_number],
                      ['Admission Year', student.admission_year || 2024], ['Email', student.institutional_email || '\u2014']
                    ] as [string, any][]).map(([l, v]) => (
                      <div key={l} className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
                        <span className="text-sm text-muted-foreground">{l}</span>
                        <span className="font-medium text-sm">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Results */}
              <Card className="bg-white">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-purple-600" />Results</CardTitle>
                    <Button onClick={handleDownloadResult} disabled={isLoading} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {publishedResults.length > 0 ? (
                    <div className="space-y-3">
                      {publishedResults.map((r: any, i: number) => (
                        <div key={i} className="p-4 border rounded-xl">
                          <div className="flex justify-between mb-2">
                            <div><h4 className="font-semibold">Semester {r.semester}</h4><p className="text-xs text-muted-foreground">{r.academic_year}</p></div>
                            <Badge className={r.result_status==='PASS'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}>{r.result_status}</Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <div className="text-center p-2 bg-blue-50 rounded-lg"><div className="text-lg font-bold text-blue-700">{r.sgpa?.toFixed(2)}</div><p className="text-[9px] text-blue-600/70">SGPA</p></div>
                            <div className="text-center p-2 bg-purple-50 rounded-lg"><div className="text-lg font-bold text-purple-700">{r.cgpa?.toFixed(2)}</div><p className="text-[9px] text-purple-600/70">CGPA</p></div>
                            <div className="text-center p-2 bg-green-50 rounded-lg"><div className="text-lg font-bold text-green-700">{r.overall_percentage?.toFixed(1)}%</div><p className="text-[9px] text-green-600/70">Percentage</p></div>
                            <div className="text-center p-2 bg-amber-50 rounded-lg"><div className="text-sm font-bold text-amber-700">{r.result_class}</div><p className="text-[9px] text-amber-600/70">Class</p></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Award className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-muted-foreground text-sm">No results published yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notifications */}
              <ExamNotifications
                studentId={student.id}
                studentName={`${student.first_name} ${student.middle_name} ${student.last_name}`}
                rollNumber={student.roll_number}
                department={student.department}
                semester={student.current_semester || 1}
              />
            </div>
          )}
        </main>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Min 8 characters</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Current Password</Label><Input type="password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)} /></div>
            <div className="space-y-2"><Label>New Password</Label><Input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} /></div>
            <div className="space-y-2"><Label>Confirm Password</Label><Input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={()=>setShowChangePassword(false)}>Cancel</Button>
            <Button onClick={handleChangePassword}>Change</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Club Frame Animation Overlay */}
      {activeClubAnimation && (
        <ClubFrameAnimation
          clubId={activeClubAnimation}
          clubName={
            activeClubAnimation === 'nss' ? 'NSS (National Service Scheme)' :
            activeClubAnimation === 'rotaract' ? 'Rotaract Club' :
            'Student Council'
          }
          onClose={() => setActiveClubAnimation(null)}
        />
      )}
    </div>
  );
};

export default StudentPortal;
