"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit, Trash2, Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const supabase = createClient();

interface ImagingTest {
  id: string;
  code_examen: string | null;
  nom_examen: string;
  type_examen: string;
  prix: number;
  description: string;
  clinic_id: string;
}

export default function ImagingPricingPage() {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<ImagingTest[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ImagingTest | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code_examen: "" as string,
    nom_examen: "" as string,
    type_examen: "Radiographie" as string,
    prix: "" as string,
    description: "" as string,
  });

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("imaging_tests")
        .select("*")
        .order("nom_examen", { ascending: true });

      if (error) throw error;
      setExams(data || []);
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleOpenModal = (exam?: ImagingTest) => {
    if (exam) {
      setEditingExam(exam);
      setFormData({
        code_examen: exam.code_examen || "",
        nom_examen: exam.nom_examen,
        type_examen: exam.type_examen || "Radiographie",
        prix: exam.prix.toString(),
        description: exam.description || "",
      });
    } else {
      setEditingExam(null);
      setFormData({
        code_examen: "",
        nom_examen: "",
        type_examen: "Radiographie",
        prix: "",
        description: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user.id)
        .single();
      
      if (!profile) throw new Error("Profil non trouvé");

      const payload = {
        nom_examen: formData.nom_examen,
        type_examen: formData.type_examen,
        prix: parseFloat(formData.prix),
        description: formData.description,
        clinic_id: profile.clinic_id,
      };

      if (editingExam) {
        const { error } = await supabase
          .from("imaging_tests")
          .update(payload)
          .eq("id", editingExam.id);
        if (error) throw error;
        toast.success("Examen mis à jour");
      } else {
        const { error } = await supabase
          .from("imaging_tests")
          .insert([payload]);
        if (error) throw error;
        toast.success("Examen ajouté au catalogue");
      }

      setIsModalOpen(false);
      fetchExams();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet examen ?")) return;
    try {
      const { error } = await supabase.from("imaging_tests").delete().eq("id", id);
      if (error) throw error;
      toast.success("Examen supprimé");
      fetchExams();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    }
  };

  const filteredExams = exams.filter(e => 
    e.nom_examen.toLowerCase().includes(search.toLowerCase()) ||
    e.code_examen?.toLowerCase().includes(search.toLowerCase()) ||
    e.type_examen?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Imagerie Médicale</h1>
          <p className="text-slate-500">Gérez les tarifs des examens de radiologie et d'imagerie.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter un examen
        </Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher un examen..."
              className="pl-9 bg-slate-50 border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[120px]">Code</TableHead>
                <TableHead>Examen</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Prix (FCFA)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredExams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500 italic">
                    Aucun examen d'imagerie trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExams.map((exam) => (
                  <TableRow key={exam.id} className="group">
                    <TableCell className="font-mono text-xs font-bold text-primary italic">
                      {exam.code_examen || "---"}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{exam.nom_examen}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-bold uppercase border border-blue-100">
                        {exam.type_examen}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      {new Intl.NumberFormat('fr-FR').format(exam.prix)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(exam)} className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(exam.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-blue-700">
                <Camera className="h-5 w-5" />
                {editingExam ? "Modifier l'examen" : "Nouvel examen d'imagerie"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label htmlFor="code" className="text-slate-400">Code Examen (Auto)</Label>
                   <Input
                     id="code"
                     disabled
                     placeholder="Auto-généré"
                     value={formData.code_examen || ""}
                   />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prix">Prix (FCFA)</Label>
                  <Input
                    id="prix"
                    type="number"
                    required
                    value={formData.prix}
                    onChange={(e) => setFormData({ ...formData, prix: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom de l'examen</Label>
                <Input
                  id="nom"
                  required
                  placeholder="ex: Radio Thorax, Echo Abdominale..."
                  value={formData.nom_examen}
                  onChange={(e) => setFormData({ ...formData, nom_examen: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type d'examen</Label>
                <Select 
                  value={formData.type_examen || "Radiographie"} 
                  onValueChange={(v) => v && setFormData({ ...formData, type_examen: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Radiographie">Radiographie</SelectItem>
                    <SelectItem value="Échographie">Échographie</SelectItem>
                    <SelectItem value="Scanner">Scanner (TDM)</SelectItem>
                    <SelectItem value="IRM">IRM</SelectItem>
                    <SelectItem value="Mammographie">Mammographie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  placeholder="Notes ou détails techniques..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enregistrer l'examen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
