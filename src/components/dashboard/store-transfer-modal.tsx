"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { 
  ArrowRightLeft, 
  Plus, 
  Search, 
  Loader2, 
  AlertCircle,
  Pill
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const supabase = createClient();

interface StoreTransferModalProps {
  onCreated: () => void;
}

export function StoreTransferModal({ onCreated }: StoreTransferModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stock, setStock] = useState<any[]>([]);
  const [selectedStockId, setSelectedStockId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [destination, setDestination] = useState("pharmacy");

  useEffect(() => {
    if (open) {
      fetchStock();
    }
  }, [open]);

  async function fetchStock() {
    const { data, error } = await supabase
      .from("central_stock")
      .select(`
        id,
        quantity,
        batch_number,
        medicines (name, dosage, form)
      `)
      .gt("quantity", 0)
      .order("medicines(name)", { ascending: true });
    
    if (error) {
      toast.error("Erreur lors du chargement du stock");
    } else {
      setStock(data || []);
    }
  }

  const selectedStockItem = stock.find(s => s.id === selectedStockId);

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStockId || !quantity || !destination) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantité invalide");
      return;
    }

    if (selectedStockItem && qty > selectedStockItem.quantity) {
      toast.error("Quantité supérieure au stock disponible");
      return;
    }

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

      // 1. Create Transfer Record
      const { error: transferError } = await supabase
        .from("stock_transfers")
        .insert([{
          medicine_id: selectedStockItem.medicines.id,
          source_stock_id: selectedStockId,
          quantity: qty,
          destination: destination,
          status: "pending",
          clinic_id: profile.clinic_id,
          requested_by: user.id
        }]);

      if (transferError) throw transferError;

      // 2. Reduce Central Stock
      const { error: stockError } = await supabase
        .from("central_stock")
        .update({ quantity: selectedStockItem.quantity - qty })
        .eq("id", selectedStockId);

      if (stockError) throw stockError;

      toast.success("Transfert initié avec succès");
      setOpen(false);
      onCreated();
      
      // Reset form
      setSelectedStockId("");
      setQuantity("");
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
    }}>
      <DialogTrigger render={
        <Button className="gap-2">
          <ArrowRightLeft className="h-4 w-4" /> Nouveau Transfert
        </Button>
      } />
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleTransfer}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Transfert vers Pharmacie
            </DialogTitle>
            <DialogDescription>
              Déplacez des médicaments du Magasin Central vers le stock de la Pharmacie.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="medicine">Médicament à transférer</Label>
              <Select value={selectedStockId} onValueChange={(val) => setSelectedStockId(val || "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un article en stock" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {stock.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex flex-col items-start">
                        <span className="font-bold">{s.medicines?.name}</span>
                        <span className="text-[10px] text-slate-500">
                          Lot: {s.batch_number} | Dispo: {s.quantity} units
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStockItem && (
               <div className="bg-blue-50 p-3 rounded-md border border-blue-100 flex items-start gap-3">
                 <Pill className="h-5 w-5 text-blue-600 mt-0.5" />
                 <div>
                    <div className="text-sm font-bold text-blue-900">{selectedStockItem.medicines?.name}</div>
                    <div className="text-[10px] text-blue-700">
                      {selectedStockItem.medicines?.dosage} - {selectedStockItem.medicines?.form}
                    </div>
                    <div className="mt-1">
                      <Badge variant="outline" className="bg-white text-blue-600 border-blue-200">
                        Stock dispo: {selectedStockItem.quantity}
                      </Badge>
                    </div>
                 </div>
               </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantité</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  max={selectedStockItem?.quantity || 99999}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dest">Destination</Label>
                <Select value={destination} onValueChange={(val) => setDestination(val || "pharmacy")}>
                  <SelectTrigger id="dest">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pharmacy">Pharmacie Centrale</SelectItem>
                    <SelectItem value="emergency">Urgences</SelectItem>
                    <SelectItem value="maternity">Maternité</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-md border border-amber-100 text-amber-800 text-[11px]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Cette action diminuera immédiatement le stock du Magasin Central.</span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={loading || !selectedStockId}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmer le Transfert
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
