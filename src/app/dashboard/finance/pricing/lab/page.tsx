"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit, Trash2, Microscope, Loader2 } from "lucide-react";
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

interface LabTest {
  id: string;
  code_analyse: string | null;
  nom_analyse: string;
  categorie: string;
  prix: number;
  description: string;
  clinic_id: string;
}

export default function LabPricingPage() {
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code_analyse: "" as string,
    nom_analyse: "" as string,
    categorie: "Biochimie" as string,
    prix: "" as string,
    description: "" as string,
  });

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lab_tests")
        .select("*")
        .order("nom_analyse", { ascending: true });

      if (error) throw error;
      setTests(data || []);
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleOpenModal = (test?: LabTest) => {
    if (test) {
      setEditingTest(test);
      setFormData({
        code_analyse: test.code_analyse || "",
        nom_analyse: test.nom_analyse,
        categorie: test.categorie || "Biochimie",
        prix: test.prix.toString(),
        description: test.description || "",
      });
    } else {
      setEditingTest(null);
      setFormData({
        code_analyse: "",
        nom_analyse: "",
        categorie: "Biochimie",
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
        nom_analyse: formData.nom_analyse,
        categorie: formData.categorie,
        prix: parseFloat(formData.prix),
        description: formData.description,
        clinic_id: profile.clinic_id,
      };

      if (editingTest) {
        const { error } = await supabase
          .from("lab_tests")
          .update(payload)
          .eq("id", editingTest.id);
        if (error) throw error;
        toast.success("Analyse mise à jour");
      } else {
        const { error } = await supabase
          .from("lab_tests")
          .insert([payload]);
        if (error) throw error;
        toast.success("Analyse ajoutée au catalogue");
      }

      setIsModalOpen(false);
      fetchTests();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette analyse ?")) return;
    try {
      const { error } = await supabase.from("lab_tests").delete().eq("id", id);
      if (error) throw error;
      toast.success("Analyse supprimée");
      fetchTests();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    }
  };

  const filteredTests = tests.filter(t => 
    t.nom_analyse.toLowerCase().includes(search.toLowerCase()) ||
    t.code_analyse?.toLowerCase().includes(search.toLowerCase()) ||
    t.categorie?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analyses Laboratoire</h1>
          <p className="text-slate-500">Catalogue des tests biologiques et prix.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter une analyse
        </Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher une analyse..."
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
                <TableHead>Désignation</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Prix (FCFA)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredTests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500 italic">
                    Aucune analyse trouvée.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTests.map((test) => (
                  <TableRow key={test.id} className="group">
                    <TableCell className="font-mono text-xs font-bold text-primary italic">
                      {test.code_analyse || "---"}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{test.nom_analyse}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase">
                        {test.categorie}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      {new Intl.NumberFormat('fr-FR').format(test.prix)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(test)} className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(test.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
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
              <DialogTitle className="flex items-center gap-2">
                <Microscope className="h-5 w-5 text-indigo-600" />
                {editingTest ? "Modifier l'analyse" : "Nouvelle analyse"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label htmlFor="code" className="text-slate-400">Code Analyse (Auto)</Label>
                   <Input
                     id="code"
                     disabled
                     placeholder="Auto-généré"
                     value={formData.code_analyse || ""}
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
                <Label htmlFor="nom">Nom de l'analyse</Label>
                <Input
                  id="nom"
                  required
                  placeholder="ex: NFS, Glycémie, Test Palu..."
                  value={formData.nom_analyse}
                  onChange={(e) => setFormData({ ...formData, nom_analyse: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select 
                  value={formData.categorie || "Biochimie"} 
                  onValueChange={(v) => v && setFormData({ ...formData, categorie: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Biochimie">Biochimie</SelectItem>
                    <SelectItem value="Hématologie">Hématologie</SelectItem>
                    <SelectItem value="Sérologie">Sérologie</SelectItem>
                    <SelectItem value="Parasitologie">Parasitologie</SelectItem>
                    <SelectItem value="Bactériologie">Bactériologie</SelectItem>
                    <SelectItem value="Hormonologie">Hormonologie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  placeholder="Détails supplémentaires..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
