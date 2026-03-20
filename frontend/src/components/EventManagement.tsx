import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Calendar, MapPin, Users } from "lucide-react";
import axios from 'axios';

interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  time?: string;
  location: string;
  club_id?: string;
  club_name?: string;
  attendee_count?: number;
}

interface Club { id: string; name: string; }

const EVENT_CATEGORIES = ["Workshop", "Seminar", "Hackathon", "Cultural", "Sports", "Technical", "Guest Lecture", "Other"];

const EventManagement = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', category: 'Workshop', date: '', time: '', location: '', club_id: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [eventsRes, clubsRes] = await Promise.all([
        axios.get(import.meta.env.VITE_API_URL + '/api/v1/campus/events'),
        axios.get(import.meta.env.VITE_API_URL + '/api/v1/campus/clubs')
      ]);
      setEvents(eventsRes.data || []);
      setClubs(clubsRes.data || []);
    } catch (error) { console.error('Error:', error); }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.date || !form.location) {
      toast({ title: "Title, date, and location required", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      if (editingEvent) {
        await axios.put(import.meta.env.VITE_API_URL + `/api/v1/campus/events/${editingEvent.id}`, form);
        toast({ title: "Event updated!" });
      } else {
        await axios.post(import.meta.env.VITE_API_URL + '/api/v1/campus/events', form);
        toast({ title: "Event created! 🎉" });
      }
      setShowForm(false);
      setEditingEvent(null);
      setForm({ title: '', description: '', category: 'Workshop', date: '', time: '', location: '', club_id: '' });
      loadData();
    } catch (error) {
      toast({ title: "Error saving event", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await axios.delete(import.meta.env.VITE_API_URL + `/api/v1/campus/events/${id}`);
      toast({ title: "Event deleted" });
      loadData();
    } catch (error) {
      toast({ title: "Error deleting", variant: "destructive" });
    }
  };

  const openEdit = (event: Event) => {
    setEditingEvent(event);
    setForm({
      title: event.title, description: event.description, category: event.category,
      date: event.date, time: event.time || '', location: event.location, club_id: event.club_id || ''
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Event Management</h2>
        <Button onClick={() => { setEditingEvent(null); setForm({ title: '', description: '', category: 'Workshop', date: '', time: '', location: '', club_id: '' }); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Event
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map(event => (
          <Card key={event.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{event.title}</CardTitle>
                <Badge variant="outline">{event.category}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" /> {event.date} {event.time && `at ${event.time}`}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {event.location}
              </div>
              {event.club_name && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" /> {event.club_name}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{event.attendee_count || 0} attendees</p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(event)}>
                  <Edit className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(event.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {events.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              No events yet. Click "Add Event" to create one!
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
            <DialogDescription>Students will see these events and can mark attendance.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Event Title</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. AI Workshop" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="What's this event about?" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.category}
                  onChange={e => setForm({...form, category: e.target.value})}>
                  {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Organizing Club</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.club_id}
                  onChange={e => setForm({...form, club_id: e.target.value})}>
                  <option value="">None</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="e.g. Block B, Room 204" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {editingEvent ? 'Update' : 'Create'} Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventManagement;
