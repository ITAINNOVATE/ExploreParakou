"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { 
  Loader2, 
  Search, 
  Check, 
  ChevronsUpDown, 
  Receipt, 
  Trash2, 
  PlusCircle, 
  Stethoscope, 
  TestTube2, 
  Microscope, 
  Pill,
  ShoppingBasket
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  patient_id: z.string().min(1, "Le patient est requis"),
  items: z.array(z.object({
    service_id: z.string().min(1, "L'acte est requis"),
    nom_service: z.string(),
    service_type: z.string(),
    prix_unitaire: z.coerce.number().min(0),
    quantite: z.coerce.number().min(1),
    total: z.coerce.number().min(0),
    category: z.string(), // acts, labs, imaging, meds
  })).min(1, "Au moins un acte est requis"),
  total_amount: z.coerce.number().min(0),
});

type FormValues = z.infer<typeof formSchema>;

interface CatalogItem {
  id: string;
  name: string;
  price: number;
  category: string;
  subCategory?: string;
}

interface BillingFormProps {
  patientId?: string;
  onSuccess?: () => void;
  showPatientSelector?: boolean;
}

export function BillingForm({ patientId, onSuccess, showPatientSelector = true }: BillingFormProps) {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  
  const [catalog, setCatalog] = useState<{
    acts: CatalogItem[];
    labs: CatalogItem[];
    imaging: CatalogItem[];
    meds: CatalogItem[];
  }>({
    acts: [],
    labs: [],
    imaging: [],
    meds: [],
  });

  const [activeTab, setActiveTab] = useState("acts");
  const [itemSearch, setItemSearch] = useState("");
  const basketScrollRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      patient_id: patientId || "",
      items: [],
      total_amount: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  useEffect(() => {
    const total = watchedItems.reduce((acc, item) => acc + (item.total || 0), 0);
    form.setValue("total_amount", total);

    // Auto-scroll to bottom of basket when items change
    if (basketScrollRef.current) {
        const scrollContainer = basketScrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
            scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
        }
    }
  }, [watchedItems, form]);

  useEffect(() => {
    fetchData();
    if (patientId) {
      form.setValue("patient_id", patientId);
    }
  }, [patientId]);

  async function fetchData() {
    const { data: pts } = await supabase.from("patients").select("id, first_name, last_name");
    if (pts) setPatients(pts);

    const [actsRes, labsRes, imgRes, medsRes] = await Promise.all([
      supabase.from("medical_services").select("id, nom_acte, prix, categorie"),
      supabase.from("lab_tests").select("id, nom_analyse, prix, categorie"),
      supabase.from("imaging_tests").select("id, nom_examen, prix, type_examen"),
      supabase.from("medicines").select("id, name, selling_price, category"),
    ]);

    setCatalog({
      acts: (actsRes.data || []).map(i => ({ id: i.id, name: i.nom_acte, price: i.prix, category: "acts", subCategory: i.categorie })),
      labs: (labsRes.data || []).map(i => ({ id: i.id, name: i.nom_analyse, price: i.prix, category: "labs", subCategory: i.categorie })),
      imaging: (imgRes.data || []).map(i => ({ id: i.id, name: i.nom_examen, price: i.prix, category: "imaging", subCategory: i.type_examen })),
      meds: (medsRes.data || []).map(i => ({ id: i.id, name: i.name, price: i.selling_price, category: "meds", subCategory: i.category })),
    });
  }

  const filteredItems = useMemo(() => {
    const list = catalog[activeTab as keyof typeof catalog] || [];
    if (!itemSearch) return list;
    return list.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()));
  }, [catalog, activeTab, itemSearch]);

  const addToBasket = (item: CatalogItem) => {
    append({
      service_id: item.id,
      nom_service: item.name,
      service_type: item.subCategory || "Service",
      prix_unitaire: item.price,
      quantite: 1,
      total: item.price,
      category: item.category
    });
    toast.success(`${item.name} ajouté au panier`);
  };

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.clinic_id) {
        toast.error("Erreur: Profil clinique introuvable.");
        return;
      }

      const { data: invoice, error: invError } = await supabase
        .from("invoices")
        .insert([{ 
          patient_id: values.patient_id,
          amount: values.total_amount,
          clinic_id: profile.clinic_id,
          status: 'pending'
        }])
        .select()
        .single();

      if (invError) throw invError;

      const invoiceItems = values.items.map(item => ({
        invoice_id: invoice.id,
        clinic_id: profile.clinic_id,
        service_id: item.service_id,
        nom_service: item.nom_service,
        service_type: item.service_type,
        prix_unitaire: item.prix_unitaire,
        quantite: item.quantite,
        total: item.total
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      toast.success("Facture générée avec succès.");
      form.reset({
        patient_id: patientId || "",
        items: [],
        total_amount: 0
      });
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {showPatientSelector && (
        <div className="p-4 border-b bg-indigo-50/10 shrink-0">
          <div className="flex items-center justify-between gap-4">
             <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-indigo-600" />
                <span className="font-bold text-slate-700">Sélectionner Patient</span>
             </div>
             <div className="flex-1 max-w-[400px]">
                <Form {...form}>
                  <FormField
                    control={form.control}
                    name="patient_id"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                          <PopoverTrigger render={
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between h-10 truncate bg-white"
                              disabled={!!patientId}
                            >
                              {field.value
                                ? `${patients.find((p) => p.id === field.value)?.first_name} ${patients.find((p) => p.id === field.value)?.last_name}`
                                : "Choisir un patient..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          } />
                          <PopoverContent className="w-[400px] p-0" align="end">
                            <Command>
                              <CommandInput placeholder="Rechercher patient..." />
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
                      </FormItem>
                    )}
                  />
                </Form>
             </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden bg-slate-50">
        {/* Left: Catalog */}
        <div className="w-1/2 border-r flex flex-col h-full bg-white">
          <Tabs defaultValue="acts" className="flex flex-col h-full" onValueChange={setActiveTab}>
            <div className="px-4 pt-4 shrink-0">
              <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1">
                <TabsTrigger value="acts" className="gap-2 text-xs">
                  <Stethoscope className="h-3 w-3" />
                  Actes
                </TabsTrigger>
                <TabsTrigger value="labs" className="gap-2 text-xs">
                  <TestTube2 className="h-3 w-3" />
                  Labo
                </TabsTrigger>
                <TabsTrigger value="imaging" className="gap-2 text-xs">
                  <Microscope className="h-3 w-3" />
                  Imagerie
                </TabsTrigger>
                <TabsTrigger value="meds" className="gap-2 text-xs">
                  <Pill className="h-3 w-3" />
                  Pharmas
                </TabsTrigger>
              </TabsList>
              <div className="relative mt-4 mb-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher une prestation..." 
                  className="pl-9 bg-slate-50 border-none shadow-none text-sm"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="flex-1 px-4">
              <div className="py-2 space-y-1">
                {filteredItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-indigo-100 hover:bg-indigo-50/50 cursor-pointer group transition-all"
                    onClick={() => addToBasket(item)}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-normal py-0">
                          {item.subCategory || "Service"}
                        </Badge>
                        <span className="text-xs text-indigo-600 font-bold">{item.price.toLocaleString()} F</span>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 bg-white text-indigo-600 shadow-sm transition-all scale-90 group-hover:scale-100">
                      <PlusCircle className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Right: Basket */}
        <div className="w-1/2 flex flex-col h-full bg-slate-50">
          <div className="p-4 shrink-0 flex items-center justify-between border-b bg-indigo-50/30">
            <div className="flex items-center gap-2">
              <ShoppingBasket className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-indigo-900">Panier de Facturation</h3>
              <Badge className="bg-indigo-600">{fields.length}</Badge>
            </div>
          </div>

          <ScrollArea className="flex-1" ref={basketScrollRef}>
            <div className="p-4 space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                  <div className="p-3 flex items-start gap-3">
                    <div className="flex-1 truncate">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{form.watch(`items.${index}.category`)}</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{form.watch(`items.${index}.nom_service`)}</p>
                      <p className="text-xs text-muted-foreground">{form.watch(`items.${index}.prix_unitaire`).toLocaleString()} F / unité</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Input 
                        type="number" 
                        className="h-8 w-16 text-center text-xs"
                        {...form.register(`items.${index}.quantite`, { 
                          valueAsNumber: true,
                          onChange: (e) => {
                            const qty = parseFloat(e.target.value) || 0;
                            const price = form.getValues(`items.${index}.prix_unitaire`) || 0;
                            form.setValue(`items.${index}.total`, qty * price);
                          }
                        })}
                      />
                      <p className="text-sm font-bold text-indigo-600">
                        {form.watch(`items.${index}.total`).toLocaleString()} F
                      </p>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-slate-400 hover:text-red-500 shrink-0"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {fields.length === 0 && (
                <div className="h-[200px] flex flex-col items-center justify-center border-2 border-dashed rounded-2xl opacity-40">
                  <ShoppingBasket className="h-8 w-8 mb-2" />
                  <p className="text-sm font-medium">Le panier est vide</p>
                  <p className="text-[10px] text-center px-4 mt-1">Sélectionnez une catégorie à gauche.</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-6 bg-slate-900 text-white shrink-0">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium uppercase tracking-widest">Total à régler</span>
              <span className="text-3xl font-black tracking-tight">{form.watch("total_amount").toLocaleString()} <small className="text-sm font-normal opacity-60">F CFA</small></span>
            </div>
            <Button 
              onClick={form.handleSubmit(onSubmit)} 
              disabled={loading || fields.length === 0 || !form.watch("patient_id")} 
              className="w-full h-14 text-lg font-bold gap-3 bg-indigo-600 hover:bg-indigo-700 shadow-xl group"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Receipt className="h-5 w-5 transition-transform group-hover:rotate-12" />}
              Générer la Facture
            </Button>
            {!form.watch("patient_id") && fields.length > 0 && (
                <p className="text-[10px] text-amber-400 text-center mt-3 font-medium px-4">⚠️ Veuillez sélectionner un patient avant de valider.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
