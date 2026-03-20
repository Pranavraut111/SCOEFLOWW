import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, MapPin, Building } from "lucide-react";
import axios from 'axios';

interface CampusLocation {
  id: string;
  name: string;
  building: string;
  floor: string;
  description: string;
  category: string;
}

const LOCATION_CATEGORIES = ["Lab", "Classroom", "Office", "Library", "Canteen", "Auditorium", "Sports", "Other"];

const CampusLocationManager = () => {
  const { toast } = useToast();
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingLoc, setEditingLoc] = useState<CampusLocation | null>(null);
  const [form, setForm] = useState({
    name: '', building: '', floor: '', description: '', category: 'Lab'
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { loadLocations(); }, []);

  const loadLocations = async () => {
    try {
      const res = await axios.get(import.meta.env.VITE_API_URL + '/api/v1/campus/locations');
      setLocations(res.data || []);
    } catch (error) { console.error('Error:', error); }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.building || !form.floor) {
      toast({ title: "Name, building, and floor required", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      if (editingLoc) {
        await axios.put(import.meta.env.VITE_API_URL + `/api/v1/campus/locations/${editingLoc.id}`, form);
        toast({ title: "Location updated!" });
      } else {
        await axios.post(import.meta.env.VITE_API_URL + '/api/v1/campus/locations', form);
        toast({ title: "Location added! 📍" });
      }
      setShowForm(false);
      setEditingLoc(null);
      setForm({ name: '', building: '', floor: '', description: '', category: 'Lab' });
      loadLocations();
    } catch (error) {
      toast({ title: "Error saving location", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this location?')) return;
    try {
      await axios.delete(import.meta.env.VITE_API_URL + `/api/v1/campus/locations/${id}`);
      toast({ title: "Location deleted" });
      loadLocations();
    } catch (error) {
      toast({ title: "Error deleting", variant: "destructive" });
    }
  };

  const openEdit = (loc: CampusLocation) => {
    setEditingLoc(loc);
    setForm({ name: loc.name, building: loc.building, floor: loc.floor, description: loc.description, category: loc.category });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Campus Locations</h2>
        <Button onClick={() => { setEditingLoc(null); setForm({ name: '', building: '', floor: '', description: '', category: 'Lab' }); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Location
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map(loc => (
          <Card key={loc.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{loc.name}</CardTitle>
                <Badge variant="outline">{loc.category}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{loc.description}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building className="h-3 w-3" /> {loc.building}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> Floor {loc.floor}
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(loc)}>
                  <Edit className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(loc.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {locations.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              No locations added yet. Add campus locations so the AI can help students navigate!
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLoc ? 'Edit Location' : 'Add Campus Location'}</DialogTitle>
            <DialogDescription>The AI assistant will use these locations for campus navigation help.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Location Name</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Robotics Lab" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Building</Label>
                <Input value={form.building} onChange={e => setForm({...form, building: e.target.value})} placeholder="e.g. Block B" />
              </div>
              <div className="space-y-2">
                <Label>Floor</Label>
                <Input value={form.floor} onChange={e => setForm({...form, floor: e.target.value})} placeholder="e.g. 2" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.category}
                onChange={e => setForm({...form, category: e.target.value})}>
                {LOCATION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Brief description" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {editingLoc ? 'Update' : 'Add'} Location
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampusLocationManager;
