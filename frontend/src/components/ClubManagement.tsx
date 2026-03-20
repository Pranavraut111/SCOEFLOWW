import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Users } from "lucide-react";
import axios from 'axios';

interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  image_url?: string;
  member_count?: number;
}

const CATEGORIES = ["Technology", "Sports", "Arts", "Science", "Cultural", "Social", "Academic", "Other"];

const ClubManagement = () => {
  const { toast } = useToast();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [form, setForm] = useState({ name: '', description: '', category: 'Technology', image_url: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { loadClubs(); }, []);

  const loadClubs = async () => {
    try {
      const res = await axios.get(import.meta.env.VITE_API_URL + '/api/v1/campus/clubs');
      setClubs(res.data || []);
    } catch (error) { console.error('Error loading clubs:', error); }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.description) {
      toast({ title: "Name and description required", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      if (editingClub) {
        await axios.put(import.meta.env.VITE_API_URL + `/api/v1/campus/clubs/${editingClub.id}`, form);
        toast({ title: "Club updated!" });
      } else {
        await axios.post(import.meta.env.VITE_API_URL + '/api/v1/campus/clubs', form);
        toast({ title: "Club created! 🎉" });
      }
      setShowForm(false);
      setEditingClub(null);
      setForm({ name: '', description: '', category: 'Technology', image_url: '' });
      loadClubs();
    } catch (error) {
      toast({ title: "Error saving club", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this club?')) return;
    try {
      await axios.delete(import.meta.env.VITE_API_URL + `/api/v1/campus/clubs/${id}`);
      toast({ title: "Club deleted" });
      loadClubs();
    } catch (error) {
      toast({ title: "Error deleting", variant: "destructive" });
    }
  };

  const openEdit = (club: Club) => {
    setEditingClub(club);
    setForm({ name: club.name, description: club.description, category: club.category, image_url: club.image_url || '' });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Club Management</h2>
        <Button onClick={() => { setEditingClub(null); setForm({ name: '', description: '', category: 'Technology', image_url: '' }); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Club
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clubs.map(club => (
          <Card key={club.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{club.name}</CardTitle>
                <Badge variant="outline">{club.category}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{club.description}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" /> {club.member_count || 0} members
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(club)}>
                  <Edit className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(club.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {clubs.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              No clubs yet. Click "Add Club" to create one!
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClub ? 'Edit Club' : 'Add New Club'}</DialogTitle>
            <DialogDescription>Students will be able to browse and join clubs.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Club Name</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Robotics Club" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="What is this club about?" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.category}
                onChange={e => setForm({...form, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {editingClub ? 'Update' : 'Create'} Club
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClubManagement;
