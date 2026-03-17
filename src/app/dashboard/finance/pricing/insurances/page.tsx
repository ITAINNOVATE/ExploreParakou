"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit, Trash2, Shield, Loader2, Percent } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const supabase = createClient();

interface Insurance {
  id: string;
  code_assurance: string | null;
  nom_assurance: string;
  pourcentage_couverture: number;
  description: string;
  clinic_id: string;
}

export default function InsurancesPage() {
  const [loading, setLoading] = useState(true);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code_assurance: "",
    nom_assurance: "",
    pourcentage_couverture: "80",
    description: "",
  });

  const fetchInsurances = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("insurances")
        .select("*")
        .order("nom_assurance", { ascending: true });

      if (error) throw error;
      setInsurances(data || []);
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsurances();
  }, [fetchInsurances]);

  const handleOpenModal = (ins?: Insurance) => {
    if (ins) {
      setEditingInsurance(ins);
      setFormData({
        code_assurance: ins.code_assurance || "",
        nom_assurance: ins.nom_assurance,
        pourcentage_couverture: ins.pourcentage_couverture.toString(),
        description: ins.description || "",
      });
    } else {
      setEditingInsurance(null);
      setFormData({
        code_assurance: "",
        nom_assurance: "",
        pourcentage_couverture: "80",
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
        nom_assurance: formData.nom_assurance,
        pourcentage_couverture: parseFloat(formData.pourcentage_couverture),
        description: formData.description,
        clinic_id: profile.clinic_id,
      };

      if (editingInsurance) {
        const { error } = await supabase
          .from("insurances")
          .update(payload)
          .eq("id", editingInsurance.id);
        if (error) throw error;
        toast.success("Assurance mise à jour");
      } else {
        const { error } = await supabase
          .from("insurances")
          .insert([payload]);
        if (error) throw error;
        toast.success("Assurance ajoutée");
      }

      setIsModalOpen(false);
      fetchInsurances();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette assurance ?")) return;
    try {
      const { error } = await supabase.from("insurances").delete().eq("id", id);
      if (error) throw error;
      toast.success("Assurance supprimée");
      fetchInsurances();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    }
  };

  const filteredInsurances = insurances.filter(i => 
    i.nom_assurance.toLowerCase().includes(search.toLowerCase()) ||
    i.code_assurance?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Assurances & Conventions</h1>
          <p className="text-slate-500">Configurez les taux de prise en charge par assurancePartner.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter une assurance
        </Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher une assurance..."
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
                <TableHead>Assurance</TableHead>
                <TableHead>Couverture</TableHead>
                <TableHead>Description</TableHead>
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
              ) : filteredInsurances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500 italic">
                    Aucune assurance configurée.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInsurances.map((ins) => (
                  <TableRow key={ins.id} className="group">
                    <TableCell className="font-mono text-xs font-bold text-primary italic">
                      {ins.code_assurance || "---"}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">{ins.nom_assurance}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                         <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500" 
                              style={{ width: `${ins.pourcentage_couverture}%` }} 
                            />
                         </div>
                         <span className="font-bold text-emerald-600">{ins.pourcentage_couverture}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm max-w-[300px] truncate">
                      {ins.description || "---"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(ins)} className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(ins.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
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
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <Shield className="h-5 w-5" />
                {editingInsurance ? "Modifier l'assurance" : "Nouvelle assurance"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label htmlFor="code" className="text-slate-400">Code (Auto)</Label>
                   <Input
                     id="code"
                     disabled
                     placeholder="Auto-généré"
                     value={formData.code_assurance || ""}
                   />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taux" className="flex items-center gap-1">
                    Couverture (%) <Percent className="h-3 w-3" />
                  </Label>
                  <Input
                    id="taux"
                    type="number"
                    min="0"
                    max="100"
                    required
                    placeholder="0 - 100"
                    value={formData.pourcentage_couverture}
                    onChange={(e) => setFormData({ ...formData, pourcentage_couverture: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom de l'assurance</Label>
                <Input
                  id="nom"
                  required
                  placeholder="ex: NSIA, Saham, Convention Entreprise X..."
                  value={formData.nom_assurance}
                  onChange={(e) => setFormData({ ...formData, nom_assurance: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Notes / Description</Label>
                <Textarea
                  id="desc"
                  placeholder="Détails sur la convention..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enregistrer l'assurance
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
