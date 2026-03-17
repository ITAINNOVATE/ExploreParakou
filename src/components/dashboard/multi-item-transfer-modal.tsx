"use client";

import { useState, useEffect } from "react";
import { 
  ArrowRightLeft, 
  Search, 
  Trash2, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  Package,
  Pill
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const supabase = createClient();

interface TransferItem {
  stock_id: string; // ID from central_stock
  medicine_id: string; // ID from medicines
  name: string;
  dosage: string;
  batch_number: string;
  available_qty: number;
  transfer_qty: number;
}

export function MultiItemTransferModal({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Select items, 2: Qty & Dest, 3: Review
  const [loading, setLoading] = useState(false);
  const [stock, setStock] = useState<any[]>([]);
  const [basket, setBasket] = useState<TransferItem[]>([]);
  const [destination, setDestination] = useState("pharmacy");
  const [searchOpen, setSearchOpen] = useState(false);

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
        medicines (id, name, dosage, form)
      `)
      .gt("quantity", 0)
      .order("medicines(name)", { ascending: true });
    
    if (!error) {
      setStock(data || []);
    }
  }

  const addToBasket = (item: any) => {
    if (basket.find(b => b.stock_id === item.id)) {
      toast.error("Cet article est déjà dans le panier");
      return;
    }
    const newItem: TransferItem = {
      stock_id: item.id,
      medicine_id: item.medicines.id,
      name: item.medicines.name,
      dosage: item.medicines.dosage,
      batch_number: item.batch_number,
      available_qty: item.quantity,
      transfer_qty: 0
    };
    setBasket([...basket, newItem]);
    setSearchOpen(false);
  };

  const removeFromBasket = (stockId: string) => {
    setBasket(basket.filter(b => b.stock_id !== stockId));
  };

  const updateBasketQty = (stockId: string, qty: number) => {
    setBasket(basket.map(b => 
      b.stock_id === stockId ? { ...b, transfer_qty: qty } : b
    ));
  };

  const validateStep2 = () => {
    for (const item of basket) {
      if (item.transfer_qty <= 0) {
        toast.error(`Quantité invalide pour ${item.name}`);
        return false;
      }
      if (item.transfer_qty > item.available_qty) {
        toast.error(`Quantité de transfert (${item.transfer_qty}) supérieure au stock disponible (${item.available_qty}) pour ${item.name}`);
        return false;
      }
    }
    return true;
  };

  async function handleFinalSubmit() {
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

      // We need to execute multiple updates and inserts.
      // Ideally this should be a transaction, but we'll do them sequentially or in bulk.
      
      // 1. Create Transfer Records
      const transfers = basket.map(item => ({
        medicine_id: item.medicine_id,
        source_stock_id: item.stock_id,
        quantity: item.transfer_qty,
        destination: destination,
        status: "pending",
        clinic_id: profile.clinic_id,
        requested_by: user.id
      }));

      const { error: transferError } = await supabase
        .from("stock_transfers")
        .insert(transfers);
      
      if (transferError) throw transferError;

      // 2. Reduce Central Stock (Batch updates aren't directly available for different values in Supabase client, so we loop)
      for (const item of basket) {
        const { error: stockError } = await supabase
          .from("central_stock")
          .update({ quantity: item.available_qty - item.transfer_qty })
          .eq("id", item.stock_id);
        if (stockError) throw stockError;
      }

      toast.success(`${basket.length} transferts initiés avec succès`);
      setOpen(false);
      resetFlow();
      onCreated();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const resetFlow = () => {
    setBasket([]);
    setStep(1);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v, eventDetails) => { 
      if (!v && (eventDetails.reason === "outside-press" || eventDetails.reason === "escape-key")) {
        return;
      }
      if(!v) resetFlow(); 
      setOpen(v); 
    }}>
      <DialogTrigger render={
        <Button className="gap-2 shadow-md">
          <ArrowRightLeft className="h-4 w-4" /> Transfert Groupé
        </Button>
      } />
      <DialogContent className={step > 1 ? "sm:max-w-[800px] max-h-[90vh] overflow-y-auto" : "sm:max-w-[500px]"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            {step === 1 && "Sélection des articles à transférer"}
            {step === 2 && "Choix des quantités"}
            {step === 3 && "Vérification du transfert"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Ajoutez les médicaments en stock au panier de transfert."}
            {step === 2 && "Définitissez les unités à déplacer vers la destination."}
            {step === 3 && "Confirmez le départ des produits du magasin."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 pt-4">
            <div className="space-y-4">
              <Label>Rechercher dans le stock</Label>
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger render={
                  <Button variant="outline" className="w-full justify-between h-12">
                    <div className="flex items-center gap-2">
                      <Search className="h-5 w-5 text-slate-400" />
                      <span>Ajouter un lot du stock...</span>
                    </div>
                    <PlusCircle className="h-5 w-5" />
                  </Button>
                } />
                <PopoverContent className="w-[450px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Nom ou lot..." />
                    <CommandList>
                      <CommandEmpty>Aucun résultat en stock.</CommandEmpty>
                      <CommandGroup heading="Stock disponible">
                        {stock.map((item) => (
                          <CommandItem
                            key={item.id}
                            onSelect={() => addToBasket(item)}
                            className="p-3"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold">{item.medicines?.name}</span>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>Lot: {item.batch_number}</span>
                                <span className="text-primary font-bold">Dispo: {item.quantity}</span>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                Articles à transférer
                <Badge variant="outline">{basket.length}</Badge>
              </Label>
              <div className="border rounded-lg divide-y bg-slate-50 min-h-[100px] max-h-[300px] overflow-y-auto">
                {basket.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm italic">Aucun article sélectionné</div>
                ) : basket.map(b => (
                  <div key={b.stock_id} className="p-3 flex items-center justify-between bg-white">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{b.name}</span>
                      <span className="text-[10px] text-slate-500">Lot: {b.batch_number} (Dispo: {b.available_qty})</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFromBasket(b.stock_id)} className="text-rose-500 h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border">
                <div className="space-y-2">
                  <Label>Destination des produits</Label>
                  <Select value={destination} onValueChange={(val) => setDestination(val || "pharmacy")}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pharmacy">Pharmacie Centrale</SelectItem>
                      <SelectItem value="emergency">Urgences</SelectItem>
                      <SelectItem value="maternity">Maternité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col justify-end">
                  <div className="text-[10px] text-slate-500 italic pb-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Les produits seront déduits IMMÉDIATEMENT du stock central.
                  </div>
                </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Article & Lot</TableHead>
                    <TableHead className="text-right">Stock Actuel</TableHead>
                    <TableHead className="w-[150px] text-primary">Qté Transfert</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {basket.map((b) => (
                    <TableRow key={b.stock_id}>
                      <TableCell>
                        <div className="font-bold text-xs">{b.name}</div>
                        <div className="text-[10px] text-slate-500">Lot: {b.batch_number}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">{b.available_qty}</TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          max={b.available_qty} 
                          min="1"
                          value={b.transfer_qty} 
                          className="h-8 text-right font-bold border-primary/50"
                          onChange={(e) => updateBasketQty(b.stock_id, parseInt(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeFromBasket(b.stock_id)} className="h-8 w-8 text-rose-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="pt-4 space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
               <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                 <Truck className="h-6 w-6 text-primary" />
               </div>
               <div>
                  <div className="font-bold text-slate-900">Destination : <span className="capitalize">{destination}</span></div>
                  <div className="text-sm text-slate-600">{basket.length} lots de médicaments à expédier.</div>
               </div>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader className="bg-slate-50 text-[10px] uppercase">
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead className="text-right">Transfert</TableHead>
                    <TableHead className="text-right">Reste en Magasin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {basket.map(b => (
                    <TableRow key={b.stock_id} className="text-sm">
                      <TableCell className="font-bold text-xs">{b.name}</TableCell>
                      <TableCell className="font-mono text-[10px]">{b.batch_number}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{b.transfer_qty} U</TableCell>
                      <TableCell className="text-right font-bold text-slate-400">{b.available_qty - b.transfer_qty} U</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="bg-amber-50 p-3 rounded border border-amber-100 flex gap-3">
               <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
               <p className="text-[11px] text-amber-800 italic">
                 Le stock sera instantanément déduit pour ces articles. Assurez-vous que les produits physiques quittent bien le magasin central.
               </p>
            </div>
          </div>
        )}

        <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
           {step === 1 && (
             <Button 
               className="w-full bg-primary hover:bg-primary/90 h-12 text-lg" 
               disabled={basket.length === 0}
               onClick={() => setStep(2)}
             >
               Suivant : Cantités & Destination <ArrowRight className="h-5 w-5 ml-2" />
             </Button>
           )}
           {step === 2 && (
              <>
                <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">Retour</Button>
                <Button 
                  className="bg-primary flex-[2]" 
                  disabled={basket.length === 0}
                  onClick={() => { if(validateStep2()) setStep(3); }}
                >
                  Visualiser le récapitulatif
                </Button>
              </>
           )}
           {step === 3 && (
              <>
                <Button variant="ghost" onClick={() => setStep(2)} className="flex-1">Modifier</Button>
                <Button 
                  className="bg-primary hover:bg-primary/90 flex-[2]" 
                  disabled={loading}
                  onClick={handleFinalSubmit}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Lancer le Transfert Groupé
                </Button>
              </>
           )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Truck({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-5h-4v5a1 1 0 0 0 1 1Z" />
      <path d="M16 8h4.5a2.5 2.5 0 0 1 2.5 2.5V12" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}
