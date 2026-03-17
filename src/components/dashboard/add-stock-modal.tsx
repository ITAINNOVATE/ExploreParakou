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
import { PlusCircle, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  medicine_id: z.string().min(1, "Le médicament est requis"),
  supplier_id: z.string().min(1, "Le fournisseur est requis"),
  quantity: z.coerce.number().min(1, "La quantité doit être au moins 1"),
  expiry_date: z.string().min(1, "La date d'expiration est requise"),
  batch_number: z.string().min(1, "Le numéro de lot est requis"),
  purchase_price: z.coerce.number().min(0, "Le prix ne peut pas être négatif"),
});

type FormValues = z.infer<typeof formSchema>;

export function AddStockModal({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [medSearchOpen, setMedSearchOpen] = useState(false);
  const [supSearchOpen, setSupSearchOpen] = useState(false);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      medicine_id: "",
      supplier_id: "",
      quantity: 1,
      expiry_date: "",
      batch_number: "",
      purchase_price: 0,
    },
  });

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  async function fetchData() {
    const { data: meds } = await supabase.from("medicines").select("id, name, dosage");
    const { data: sups } = await supabase.from("suppliers").select("id, name");
    if (meds) setMedicines(meds);
    if (sups) setSuppliers(sups);
  }

  async function onSubmit(values: any) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.clinic_id) {
        toast.error("Profil clinique non trouvé.");
        return;
      }

      const { error } = await supabase
        .from("central_stock")
        .insert([{ 
          ...values, 
          clinic_id: profile.clinic_id 
        }]);

      if (error) throw error;

      toast.success("Entrée en stock enregistrée.");
      setOpen(false);
      form.reset();
      onCreated();
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
      <DialogTrigger render={
        <Button className="gap-2 shadow-lg shadow-emerald-200 bg-emerald-600 hover:bg-emerald-700 text-white">
          <PlusCircle className="h-4 w-4" />
          Réapprovisionner
        </Button>
      } />
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Nouvel Arrivage de Stock</DialogTitle>
          <DialogDescription>
            Enregistrez l'entrée de nouveaux médicaments dans le magasin central.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="medicine_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Médicament</FormLabel>
                    <Popover open={medSearchOpen} onOpenChange={setMedSearchOpen}>
                      <PopoverTrigger render={
                        <Button variant="outline" role="combobox" className="justify-between">
                          {field.value
                            ? medicines.find((m) => m.id === field.value)?.name
                            : "Choisir..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      } />
                      <PopoverContent className="w-[250px] p-0">
                        <Command>
                          <CommandInput placeholder="Rechercher..." />
                          <CommandList>
                            <CommandEmpty>Aucun trouvé.</CommandEmpty>
                            <CommandGroup>
                              {medicines.map((med) => (
                                <CommandItem
                                  key={med.id}
                                  value={med.name}
                                  onSelect={() => {
                                    form.setValue("medicine_id", med.id);
                                    setMedSearchOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", field.value === med.id ? "opacity-100" : "opacity-0")} />
                                  {med.name} ({med.dosage})
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

              <FormField
                control={form.control}
                name="supplier_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fournisseur</FormLabel>
                    <Popover open={supSearchOpen} onOpenChange={setSupSearchOpen}>
                      <PopoverTrigger render={
                        <Button variant="outline" role="combobox" className="justify-between">
                          {field.value
                            ? suppliers.find((s) => s.id === field.value)?.name
                            : "Choisir..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      } />
                      <PopoverContent className="w-[250px] p-0">
                        <Command>
                          <CommandInput placeholder="Rechercher..." />
                          <CommandList>
                            <CommandEmpty>Aucun trouvé.</CommandEmpty>
                            <CommandGroup>
                              {suppliers.map((sup) => (
                                <CommandItem
                                  key={sup.id}
                                  value={sup.name}
                                  onSelect={() => {
                                    form.setValue("supplier_id", sup.id);
                                    setSupSearchOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", field.value === sup.id ? "opacity-100" : "opacity-0")} />
                                  {sup.name}
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="batch_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de Lot</FormLabel>
                    <FormControl><Input placeholder="ex: LOT-2024-001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'Expiration</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantité</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchase_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix d'Achat Unitaire (F CFA)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Valider l'entrée
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
