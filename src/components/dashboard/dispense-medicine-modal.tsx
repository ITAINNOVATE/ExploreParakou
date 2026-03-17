"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2, Check, ChevronsUpDown, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  qty: z.number().min(1),
  price: z.number().min(0),
});

const formSchema = z.object({
  patient_id: z.string().optional(),
});

export function DispenseMedicineModal({ 
  onCreated,
  isOpen: externalOpen,
  onOpenChange: externalOnOpenChange,
  onDispensed,
}: { 
  onCreated?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDispensed?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (isControlled) {
      externalOnOpenChange?.(val);
    } else {
      setInternalOpen(val);
    }
  };
  
  const handleCreated = () => {
    onCreated?.();
    onDispensed?.();
  };

  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [medSearchOpen, setMedSearchOpen] = useState(false);
  
  const [cart, setCart] = useState<any[]>([]);
  const [selectedMed, setSelectedMed] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);

  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patient_id: "",
    },
  });

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  async function fetchData() {
    const { data: pts } = await supabase.from("patients").select("id, first_name, last_name");
    const { data: meds } = await supabase
      .from("pharmacy_stock")
      .select(`
        quantity,
        medicines (id, name, dosage)
      `)
      .gt("quantity", 0);
    
    if (pts) setPatients(pts);
    if (meds) setMedicines(meds);
  }

  const addToCart = () => {
    if (!selectedMed) return;
    const med = medicines.find(m => m.medicines.id === selectedMed);
    if (qty > med.quantity) {
      toast.error(`Quantité insuffisante en stock (${med.quantity} disponibles)`);
      return;
    }
    
    const newItem = {
      id: med.medicines.id,
      name: med.medicines.name,
      qty: qty,
      price: unitPrice,
      total: qty * unitPrice
    };

    setCart([...cart, newItem]);
    setSelectedMed("");
    setQty(1);
    setUnitPrice(0);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const totalAmount = cart.reduce((acc, item) => acc + item.total, 0);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (cart.length === 0) {
      toast.error("Le panier est vide.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user?.id)
        .single();

      if (!profile) {
        toast.error("Profil non trouvé");
        return;
      }

      // 1. Create Sale Record
      const { data: sale, error: saleError } = await supabase
        .from("pharmacy_sales")
        .insert([{
          clinic_id: profile.clinic_id,
          patient_id: values.patient_id || null,
          items: cart,
          total_amount: totalAmount
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // 2. Update Stock (Local Pharmacy)
      for (const item of cart) {
        const { data: currentStock } = await supabase
          .from("pharmacy_stock")
          .select("quantity")
          .eq("medicine_id", item.id)
          .single();

        await supabase
          .from("pharmacy_stock")
          .update({ quantity: (currentStock?.quantity || 0) - item.qty })
          .eq("medicine_id", item.id);
      }

      toast.success("Dispense effectuée avec succès.");
      setOpen(false);
      setCart([]);
      form.reset();
      handleCreated();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen, eventDetails) => {
        if (!newOpen && (eventDetails.reason === 'outside-press' || eventDetails.reason === 'escape-key')) {
          return;
        }
        setOpen(newOpen);
      }}
    >
      {!isControlled && (
        <DialogTrigger render={
          <Button className="gap-2 shadow-lg shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700 text-white">
            <ShoppingCart className="h-4 w-4" />
            Nouvelle Vente / Dispense
          </Button>
        } />
      )}
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Délivrance de Médicaments</DialogTitle>
          <DialogDescription>
            Sélectionnez un patient et ajoutez les articles au panier pour finaliser la vente.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="patient_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Patient (Optionnel)</FormLabel>
                  <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                    <PopoverTrigger render={
                      <Button variant="outline" role="combobox" className="justify-between w-full">
                        {field.value
                          ? `${patients.find((p) => p.id === field.value)?.first_name} ${patients.find((p) => p.id === field.value)?.last_name}`
                          : "Sélectionner un patient..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    } />
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Rechercher..." />
                        <CommandList>
                          <CommandEmpty>Aucun patient trouvé.</CommandEmpty>
                          <CommandGroup>
                            {patients.map((patient) => (
                              <CommandItem
                                key={patient.id}
                                value={`${patient.first_name} ${patient.last_name}`}
                                onSelect={() => {
                                  form.setValue("patient_id", patient.id);
                                  setPatientSearchOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", field.value === patient.id ? "opacity-100" : "opacity-0")} />
                                {patient.first_name} {patient.last_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border rounded-lg p-4 bg-slate-50 space-y-4">
               <h3 className="font-semibold text-sm flex items-center gap-2">
                 <Plus className="h-4 w-4 text-primary" /> Ajouter un article
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium">Médicament</label>
                    <Select onValueChange={(val) => setSelectedMed(val || "")} value={selectedMed}>
                       <SelectTrigger className="bg-white">
                         <SelectValue placeholder="Choisir..." />
                       </SelectTrigger>
                       <SelectContent>
                         {medicines.map((m) => (
                           <SelectItem key={m.medicines.id} value={m.medicines.id}>
                             {m.medicines.name} ({m.quantity} dispo)
                           </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium">Prix Unitaire (F)</label>
                    <Input 
                      type="number" 
                      className="bg-white text-sm" 
                      value={unitPrice} 
                      onChange={(e) => setUnitPrice(parseFloat(e.target.value))} 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium">Qté</label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        className="bg-white text-sm" 
                        value={qty} 
                        onChange={(e) => setQty(parseInt(e.target.value))} 
                      />
                      <Button type="button" size="sm" onClick={addToCart} className="bg-primary">
                        Ajouter
                      </Button>
                    </div>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               <h3 className="font-semibold text-sm">Panier ({cart.length} articles)</h3>
               <div className="border rounded-md divide-y max-h-[200px] overflow-y-auto">
                 {cart.length === 0 ? (
                   <div className="p-8 text-center text-slate-400 text-sm italic">Panier vide.</div>
                 ) : (
                   cart.map((item, idx) => (
                     <div key={idx} className="p-3 flex items-center justify-between text-sm hover:bg-slate-50">
                       <div className="flex-1">
                         <span className="font-medium">{item.name}</span>
                         <span className="text-slate-500 ml-2">(x{item.qty})</span>
                       </div>
                       <div className="w-32 text-right font-semibold">{item.total.toLocaleString()} F</div>
                       <Button 
                         type="button" 
                         variant="ghost" 
                         size="icon" 
                         className="text-destructive h-8 w-8 ml-2" 
                         onClick={() => removeFromCart(idx)}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </div>
                   ))
                 )}
               </div>
               
               {cart.length > 0 && (
                 <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                    <span className="font-bold text-emerald-800">TOTAL À PAYER</span>
                    <span className="text-xl font-black text-emerald-700">{totalAmount.toLocaleString()} F CFA</span>
                 </div>
               )}
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px]">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Encaisser & Valider
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Helper Select components
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
