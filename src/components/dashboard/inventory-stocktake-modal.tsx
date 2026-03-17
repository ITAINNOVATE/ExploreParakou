"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { 
  ClipboardList, 
  Plus, 
  Loader2, 
  CheckCircle2,
  AlertTriangle,
  History,
  ArrowRight
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const supabase = createClient();

interface InventoryStocktakeModalProps {
  onCreated: () => void;
}

export function InventoryStocktakeModal({ onCreated }: InventoryStocktakeModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Info, 2: Counting
  const [inventoryName, setInventoryName] = useState(`Inventaire du ${new Date().toLocaleDateString('fr-FR')}`);
  const [notes, setNotes] = useState("");
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && step === 2) {
      fetchCurrentStock();
    }
  }, [open, step]);

  async function fetchCurrentStock() {
    setLoading(true);
    const { data, error } = await supabase
      .from("central_stock")
      .select(`
        id,
        quantity,
        batch_number,
        medicines (id, name, dosage, form)
      `)
      .order("medicines(name)", { ascending: true });
    
    if (error) {
      toast.error("Erreur de chargement du stock");
    } else {
      setStockItems(data || []);
      // Initialize physical counts with theoretical ones
      const initialCounts: Record<string, string> = {};
      data?.forEach(item => {
        initialCounts[item.id] = item.quantity.toString();
      });
      setPhysicalCounts(initialCounts);
    }
    setLoading(false);
  }

  const handleCountChange = (id: string, value: string) => {
    setPhysicalCounts(prev => ({ ...prev, [id]: value }));
  };

  async function handleValidateInventory() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user.id)
        .single();
      
      if (!profile) throw new Error("Profil non trouvé");

      // 1. Create Inventory Session
      const { data: inventory, error: invError } = await supabase
        .from("inventories")
        .insert([{
          inventory_name: inventoryName,
          notes: notes,
          status: "validated",
          clinic_id: profile.clinic_id,
          created_by: user.id
        }])
        .select()
        .single();

      if (invError) throw invError;

      // 2. Create Inventory Items & Update Central Stock
      const inventoryItems = stockItems.map(item => ({
        inventory_id: inventory.id,
        medicine_id: item.medicines.id,
        batch_number: item.batch_number,
        theoretical_quantity: item.quantity,
        physical_quantity: parseInt(physicalCounts[item.id] || "0")
      }));

      const { error: itemsError } = await supabase
        .from("inventory_items")
        .insert(inventoryItems);

      if (itemsError) throw itemsError;

      // 3. Update theoretical stock to match physical reality
      for (const invItem of inventoryItems) {
        await supabase
          .from("central_stock")
          .update({ quantity: invItem.physical_quantity })
          .eq("batch_number", invItem.batch_number)
          .eq("medicine_id", invItem.medicine_id);
      }

      toast.success("Inventaire validé et stock mis à jour");
      setOpen(false);
      onCreated();
      setStep(1);
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v, eventDetails) => { 
      if (!v && (eventDetails.reason === "outside-press" || eventDetails.reason === "escape-key")) {
        return;
      }
      setOpen(v); 
      if(!v) setStep(1); 
    }}>
      <DialogTrigger render={
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <ClipboardList className="h-4 w-4" /> Nouvelle Session d'Inventaire
        </Button>
      } />
      <DialogContent className={step === 2 ? "sm:max-w-[800px] max-h-[90vh] overflow-y-auto" : "sm:max-w-[450px]"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-emerald-600" />
            {step === 1 ? "Session d'Inventaire" : "Saisie des quantités physiques"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Préparez une nouvelle session de comptage physique du stock."
              : "Veuillez saisir les quantités réellement présentes en rayon."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de l'inventaire</Label>
              <Input
                id="name"
                value={inventoryName}
                onChange={(e) => setInventoryName(e.target.value)}
                placeholder="Ex: Inventaire fin de mois Mars"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Observations</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Raison de l'inventaire, équipe de comptage..."
              />
            </div>
          </div>
        ) : (
          <div className="py-4">
            {loading ? (
              <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article & Lot</TableHead>
                      <TableHead className="text-right">Théorique</TableHead>
                      <TableHead className="w-[120px] text-right">Physique</TableHead>
                      <TableHead className="text-right">Écart</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockItems.map((item) => {
                      const physical = parseInt(physicalCounts[item.id] || "0");
                      const diff = physical - item.quantity;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-bold text-xs">{item.medicines?.name}</div>
                            <div className="text-[10px] text-slate-500">Lot: {item.batch_number}</div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              className="h-8 text-right font-bold"
                              value={physicalCounts[item.id]}
                              onChange={(e) => handleCountChange(item.id, e.target.value)}
                            />
                          </TableCell>
                          <TableCell className={`text-right font-bold text-xs ${diff === 0 ? 'text-slate-400' : diff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex justify-between items-center sm:justify-between">
          {step === 2 && (
             <Button variant="ghost" onClick={() => setStep(1)} disabled={loading}>Retour</Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Annuler</Button>
            {step === 1 ? (
              <Button onClick={() => setStep(2)} className="bg-emerald-600 hover:bg-emerald-700">
                Commencer le comptage <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleValidateInventory} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Valider & Ajuster le Stock
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
