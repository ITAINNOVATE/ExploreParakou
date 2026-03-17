"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Edit, ShoppingBag, Loader2 } from "lucide-react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AddMedicineModal } from "@/components/dashboard/add-medicine-modal";

const supabase = createClient();

interface Medicine {
  id: string;
  code_medicament: string | null;
  name: string;
  category: string;
  form: string;
  dosage: string;
  selling_price: number | null;
}

export default function MedicinePricingPage() {
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("medicines")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setMedicines(data || []);
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const handleOpenModal = (med: Medicine) => {
    setSelectedMed(med);
    setNewPrice(med.selling_price?.toString() || "0");
    setIsModalOpen(true);
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("medicines")
        .update({ selling_price: parseFloat(newPrice) })
        .eq("id", selectedMed.id);

      if (error) throw error;
      toast.success(`Prix mis à jour pour ${selectedMed.name}`);
      setIsModalOpen(false);
      fetchMedicines();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredMeds = medicines.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category?.toLowerCase().includes(search.toLowerCase()) ||
    m.code_medicament?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Tarification Médicaments</h1>
        <p className="text-slate-500">Définissez les prix de vente pour les prescriptions et la pharmacie.</p>
      </div>

      <Card className="border rounded-xl shadow-sm overflow-hidden bg-white">
        <div className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-200/60 shadow-sm">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher un médicament..."
                className="pl-10 bg-white border-slate-200 shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <AddMedicineModal onCreated={fetchMedicines} />
            </div>
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[120px]">Code</TableHead>
                <TableHead>Médicament</TableHead>
                <TableHead>Forme & Dosage</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Prix de vente (FCFA)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredMeds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 italic">
                    Aucun médicament trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMeds.map((med) => (
                  <TableRow key={med.id} className="group">
                    <TableCell className="font-mono text-xs font-bold text-primary italic">
                      {med.code_medicament || "---"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{med.name}</div>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">{med.form}</Badge>
                        <span className="text-xs">{med.dosage}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {med.category || "Général"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {med.selling_price && med.selling_price > 0 
                        ? new Intl.NumberFormat('fr-FR').format(med.selling_price)
                        : <span className="text-orange-500 font-medium italic">Non défini</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleOpenModal(med)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity gap-2"
                      >
                        <Edit className="h-3 w-3" /> Fixer le prix
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleUpdatePrice}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <ShoppingBag className="h-5 w-5" />
                Mise à jour du prix de vente
              </DialogTitle>
              <DialogDescription>
                Fixez le prix de vente pour <strong>{selectedMed?.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="price">Nouveau Prix (FCFA)</Label>
                <Input
                  id="price"
                  type="number"
                  required
                  autoFocus
                  placeholder="0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="text-lg font-bold"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Valider le tarif
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
