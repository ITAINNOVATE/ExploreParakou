"use client";

import { useState, useEffect } from "react";
import { 
  PlusCircle, 
  Loader2, 
  Check, 
  ChevronsUpDown, 
  Trash2, 
  Search, 
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  PackagePlus,
  ArrowRight,
  FileText,
  Calendar
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
import { Separator } from "@/components/ui/separator";

const supabase = createClient();

interface BasketItem {
  medicine_id: string;
  name: string;
  dosage: string;
  form: string;
  // Per-lot data – a single medicine can have multiple lots
  lots: {
    lot_key: string; // unique key for UI list management
    batch_number: string;
    expiry_date: string;
    quantity: number;
    purchase_price: number;
  }[];
}

const defaultLot = () => ({
  lot_key: crypto.randomUUID(),
  batch_number: "",
  expiry_date: "",
  quantity: 0,
  purchase_price: 0
});

export function MultiItemReceptionModal({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Header + Basket, 2: Details per lot, 3: Review
  const [loading, setLoading] = useState(false);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  
  // Reception-level fields
  const [receptionDate, setReceptionDate] = useState(new Date().toISOString().split('T')[0]);
  const [bordereauNumber, setBordereauNumber] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  
  // Basket
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [medSearchOpen, setMedSearchOpen] = useState(false);
  const [supSearchOpen, setSupSearchOpen] = useState(false);

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  async function fetchData() {
    const { data: meds } = await supabase.from("medicines").select("id, name, dosage, form");
    const { data: sups } = await supabase.from("suppliers").select("id, name");
    if (meds) setMedicines(meds);
    if (sups) setSuppliers(sups);
  }

  const addToBasket = (med: any) => {
    if (basket.find(item => item.medicine_id === med.id)) {
      toast.error("Ce médicament est déjà dans le panier. Ajoutez un lot depuis le tableau.");
      return;
    }
    setBasket([...basket, {
      medicine_id: med.id,
      name: med.name,
      dosage: med.dosage,
      form: med.form,
      lots: [defaultLot()]
    }]);
    setMedSearchOpen(false);
  };

  const removeFromBasket = (medicine_id: string) => {
    setBasket(basket.filter(item => item.medicine_id !== medicine_id));
  };

  const addLot = (medicine_id: string) => {
    setBasket(basket.map(item =>
      item.medicine_id === medicine_id
        ? { ...item, lots: [...item.lots, defaultLot()] }
        : item
    ));
  };

  const removeLot = (medicine_id: string, lot_key: string) => {
    setBasket(basket.map(item => {
      if (item.medicine_id !== medicine_id) return item;
      if (item.lots.length === 1) {
        toast.error("Supprimez le médicament si vous ne souhaitez pas le recevoir.");
        return item;
      }
      return { ...item, lots: item.lots.filter(l => l.lot_key !== lot_key) };
    }));
  };

  const updateLot = (medicine_id: string, lot_key: string, field: string, value: any) => {
    setBasket(basket.map(item =>
      item.medicine_id === medicine_id
        ? {
            ...item,
            lots: item.lots.map(l =>
              l.lot_key === lot_key ? { ...l, [field]: value } : l
            )
          }
        : item
    ));
  };

  const validateStep1 = () => {
    if (!receptionDate) { toast.error("Veuillez indiquer la date de réception"); return false; }
    if (!selectedSupplierId) { toast.error("Veuillez choisir un fournisseur"); return false; }
    if (basket.length === 0) { toast.error("Le panier est vide"); return false; }
    return true;
  };

  const validateStep2 = () => {
    for (const item of basket) {
      for (const lot of item.lots) {
        if (!lot.batch_number || !lot.expiry_date || lot.quantity <= 0 || lot.purchase_price <= 0) {
          toast.error(`Détails incomplets pour un lot de ${item.name}`);
          return false;
        }
      }
    }
    return true;
  };

  async function handleFinalSubmit() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles').select('clinic_id').eq('id', user?.id).single();

      if (!profile?.clinic_id) throw new Error("Profil clinique non trouvé.");

      // Flatten: one row per medicine × lot combination
      const inserts = basket.flatMap(item =>
        item.lots.map(lot => ({
          medicine_id: item.medicine_id,
          supplier_id: selectedSupplierId,
          quantity: lot.quantity,
          batch_number: lot.batch_number,
          expiry_date: lot.expiry_date,
          purchase_price: lot.purchase_price,
          reception_date: receptionDate,
          bordereau_number: bordereauNumber || null,
          clinic_id: profile.clinic_id
        }))
      );

      const { error } = await supabase.from("central_stock").insert(inserts);
      if (error) throw error;

      toast.success(`${inserts.length} lot(s) enregistrés avec succès dans le stock`);
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
    setSelectedSupplierId("");
    setBordereauNumber("");
    setReceptionDate(new Date().toISOString().split('T')[0]);
    setLoading(false);
  };

  const totalLots = basket.reduce((acc, item) => acc + item.lots.length, 0);
  const totalQty = basket.reduce((acc, item) => acc + item.lots.reduce((a, l) => a + (l.quantity || 0), 0), 0);
  const totalValue = basket.reduce((acc, item) => acc + item.lots.reduce((a, l) => a + (l.quantity * l.purchase_price || 0), 0), 0);

  return (
    <Dialog open={open} onOpenChange={(v, eventDetails) => { 
      if (!v && (eventDetails.reason === "outside-press" || eventDetails.reason === "escape-key")) {
        return;
      }
      if(!v) resetFlow(); 
      setOpen(v); 
    }}>
      <DialogTrigger render={
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
          <PackagePlus className="h-4 w-4" />
          Nouvelle Réception
        </Button>
      } />
      <DialogContent className={step > 1 ? "sm:max-w-[1000px] max-h-[90vh] overflow-y-auto" : "sm:max-w-[600px]"}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-emerald-600" />
            <DialogTitle>
              {step === 1 && "Nouvelle Réception — Bordereau & Articles"}
              {step === 2 && "Saisie des Lots par Article"}
              {step === 3 && "Récapitulatif de la Réception"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {step === 1 && "Renseignez les informations du bon de livraison et constituez le panier."}
            {step === 2 && "Pour chaque article, saisissez un ou plusieurs lots avec quantité et expiration."}
            {step === 3 && "Vérifiez toutes les informations avant d'intégrer au stock."}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: Header Info + Basket */}
        {step === 1 && (
          <div className="space-y-6 pt-2">
            {/* Delivery header */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Informations du Bon de Livraison</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Date de Réception</Label>
                  <Input
                    type="date"
                    value={receptionDate}
                    onChange={(e) => setReceptionDate(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> N° Bordereau de Livraison</Label>
                  <Input
                    placeholder="ex: BL-2026-0042"
                    value={bordereauNumber}
                    onChange={(e) => setBordereauNumber(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider">Fournisseur</Label>
                <SelectSupplier value={selectedSupplierId} onValueChange={setSelectedSupplierId} suppliers={suppliers} />
              </div>
            </div>

            <Separator />

            {/* Article basket */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Articles à recevoir</Label>
                <Badge variant="outline">{basket.length} article(s)</Badge>
              </div>
              <Popover open={medSearchOpen} onOpenChange={setMedSearchOpen}>
                <PopoverTrigger render={
                  <Button variant="outline" className="w-full justify-between h-11">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Search className="h-4 w-4" />
                      <span>Rechercher et ajouter un médicament...</span>
                    </div>
                    <PlusCircle className="h-4 w-4 text-emerald-500" />
                  </Button>
                } />
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Nom ou DCI du médicament..." />
                    <CommandList>
                      <CommandEmpty>Aucun résultat.</CommandEmpty>
                      <CommandGroup>
                        {medicines.map((med) => (
                          <CommandItem key={med.id} onSelect={() => addToBasket(med)} className="p-3 cursor-pointer">
                            <div>
                              <div className="font-bold">{med.name}</div>
                              <div className="text-[11px] text-slate-500">{med.dosage} — {med.form}</div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="border rounded-lg divide-y bg-slate-50 min-h-[80px] max-h-[250px] overflow-y-auto">
                {basket.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm italic">Le panier est vide</div>
                ) : basket.map(item => (
                  <div key={item.medicine_id} className="p-3 flex items-center justify-between bg-white">
                    <div>
                      <div className="font-bold text-sm">{item.name}</div>
                      <div className="text-[10px] text-slate-500">{item.dosage} — {item.form}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-emerald-600">{item.lots.length} lot(s)</Badge>
                      <Button variant="ghost" size="icon" onClick={() => removeFromBasket(item.medicine_id)} className="h-7 w-7 text-rose-400 hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Per-medicine lot details */}
        {step === 2 && (
          <div className="pt-2 space-y-4 overflow-x-auto">
            {basket.map((item) => (
              <div key={item.medicine_id} className="border rounded-xl overflow-hidden">
                <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{item.name}</div>
                    <div className="text-[10px] text-slate-400">{item.dosage} — {item.form}</div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs bg-transparent text-white border-white/30 hover:bg-white/10"
                    onClick={() => addLot(item.medicine_id)}
                  >
                    <PlusCircle className="h-3 w-3 mr-1" /> Ajouter un lot
                  </Button>
                </div>
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[160px]">N° de Lot</TableHead>
                      <TableHead className="w-[150px]">Date d'Expiration</TableHead>
                      <TableHead className="w-[100px]">Quantité</TableHead>
                      <TableHead className="w-[130px]">Prix Achat (U) F</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.lots.map((lot, idx) => (
                      <TableRow key={lot.lot_key} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <TableCell>
                          <Input
                            placeholder="LOT-2026-001"
                            value={lot.batch_number}
                            className="h-8 font-mono text-xs"
                            onChange={(e) => updateLot(item.medicine_id, lot.lot_key, 'batch_number', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={lot.expiry_date}
                            className="h-8 text-xs"
                            onChange={(e) => updateLot(item.medicine_id, lot.lot_key, 'expiry_date', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={lot.quantity || ""}
                            className="h-8 text-right"
                            onChange={(e) => updateLot(item.medicine_id, lot.lot_key, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={lot.purchase_price || ""}
                            className="h-8 text-right"
                            onChange={(e) => updateLot(item.medicine_id, lot.lot_key, 'purchase_price', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLot(item.medicine_id, lot.lot_key)}
                            className="h-8 w-8 text-rose-400 hover:text-rose-600"
                            title="Supprimer ce lot"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}

        {/* STEP 3: Review & Confirm */}
        {step === 3 && (
          <div className="pt-2 space-y-4">
            {/* Delivery summary banner */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
              <div>
                <div className="text-[10px] font-bold uppercase text-emerald-600">Date de Réception</div>
                <div className="font-bold text-slate-800">{receptionDate}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-emerald-600">N° Bordereau</div>
                <div className="font-bold text-slate-800">{bordereauNumber || <span className="italic text-slate-400">Non renseigné</span>}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-emerald-600">Fournisseur</div>
                <div className="font-bold text-slate-800">{suppliers.find(s => s.id === selectedSupplierId)?.name}</div>
              </div>
            </div>

            {/* Flat list of all lots */}
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-800">
                  <TableRow>
                    <TableHead className="text-slate-200">Médicament</TableHead>
                    <TableHead className="text-slate-200">N° Lot</TableHead>
                    <TableHead className="text-slate-200">Expiration</TableHead>
                    <TableHead className="text-slate-200 text-right">Quantité</TableHead>
                    <TableHead className="text-slate-200 text-right">Prix Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {basket.flatMap(item =>
                    item.lots.map((lot, idx) => (
                      <TableRow key={lot.lot_key} className="hover:bg-slate-50">
                        {idx === 0 && (
                          <TableCell rowSpan={item.lots.length} className="border-r font-bold text-slate-800 align-top pt-3">
                            {item.name}
                            <div className="text-[10px] text-slate-400 font-normal">{item.dosage}</div>
                          </TableCell>
                        )}
                        <TableCell className="font-mono text-xs">{lot.batch_number}</TableCell>
                        <TableCell className="text-xs">{lot.expiry_date}</TableCell>
                        <TableCell className="text-right font-bold">{lot.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-slate-600 text-xs">
                          {(lot.quantity * lot.purchase_price).toLocaleString()} F
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {/* Totals row */}
                  <TableRow className="bg-slate-800 font-bold text-white">
                    <TableCell colSpan={3} className="text-right text-slate-300">TOTAL</TableCell>
                    <TableCell className="text-right text-white">{totalLots} lots / {totalQty.toLocaleString()} U</TableCell>
                    <TableCell className="text-right text-emerald-400">{totalValue.toLocaleString()} F CFA</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg text-[11px] text-amber-800 italic">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
              <span>Après confirmation, chaque lot sera enregistré comme entrée indépendante dans le stock central.</span>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          {step === 1 && (
            <Button
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => { if(validateStep1()) setStep(2); }}
            >
              Continuer vers la saisie des lots <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {step === 2 && (
            <div className="flex gap-2 w-full">
              <Button variant="ghost" onClick={() => setStep(1)}>Retour</Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => { if(validateStep2()) setStep(3); }}
              >
                Visualiser le récapitulatif <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
          {step === 3 && (
            <div className="flex gap-2 w-full">
              <Button variant="ghost" onClick={() => setStep(2)}>Modifier</Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
                onClick={handleFinalSubmit}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Valider et Intégrer au Stock
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SelectSupplier({ value, onValueChange, suppliers }: any) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <Button variant="outline" className="w-full justify-between bg-white">
          {value ? suppliers.find((s: any) => s.id === value)?.name : <span className="text-slate-400">Choisir un fournisseur...</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      } />
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un fournisseur..." />
          <CommandList>
            <CommandEmpty>Aucun fournisseur trouvé.</CommandEmpty>
            <CommandGroup>
              {suppliers.map((sup: any) => (
                <CommandItem
                  key={sup.id}
                  value={sup.name}
                  onSelect={() => { onValueChange(sup.id); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === sup.id ? "opacity-100" : "opacity-0")} />
                  {sup.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
