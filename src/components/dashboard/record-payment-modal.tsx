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
  DialogFooter
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
import { CreditCard, Loader2, Banknote, Smartphone, CheckCircle2, Wallet, Users } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  amount: z.coerce.number().min(0, "Le montant doit être positif"),
  method: z.string().min(1, "La méthode de paiement est requise"),
  has_insurance: z.boolean().default(false),
  insurance_id: z.string().optional(),
  insurance_rate: z.coerce.number().min(0).max(100).default(0),
  insurance_amount: z.coerce.number().default(0),
});

type FormValues = z.infer<typeof formSchema>;

interface RecordPaymentModalProps {
  invoice: any;
  onCreated: () => void;
  variant?: "menu" | "button";
}

export function RecordPaymentModal({ invoice, onCreated, variant = "menu" }: RecordPaymentModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insurances, setInsurances] = useState<any[]>([]);
  const supabase = createClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      amount: invoice.remaining_balance || invoice.amount,
      method: "espèces",
      has_insurance: false,
      insurance_rate: 0,
      insurance_amount: 0,
    },
  });

  useEffect(() => {
    if (open) {
      fetchInsurances();
      form.reset({
        amount: invoice.remaining_balance || invoice.amount,
        method: "espèces",
        has_insurance: false,
        insurance_rate: 0,
        insurance_amount: 0,
      });
    }
  }, [open, invoice]);

  async function fetchInsurances() {
    const { data } = await supabase.from("insurances").select("*");
    if (data) setInsurances(data);
  }

  const watchedInsuranceRate = form.watch("insurance_rate");
  const watchedHasInsurance = form.watch("has_insurance");
  
  useEffect(() => {
    if (watchedHasInsurance) {
        const amount = (invoice.amount * (watchedInsuranceRate / 100));
        form.setValue("insurance_amount", amount);
        // Reduce requested cash amount if insurance is applied
        const remaining = invoice.remaining_balance - amount;
        form.setValue("amount", Math.max(0, remaining));
    } else {
        form.setValue("insurance_amount", 0);
        form.setValue("amount", invoice.remaining_balance);
    }
  }, [watchedInsuranceRate, watchedHasInsurance, invoice]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', user?.id)
        .single();

      // 1. Record Insurance Payment if applicable
      if (values.has_insurance && values.insurance_amount > 0) {
        await supabase.from("payments").insert([{
            clinic_id: profile?.clinic_id,
            invoice_id: invoice.id,
            amount: values.insurance_amount,
            method: "prise en charge assurance",
            notes: `Assurance: ${values.insurance_id} (${values.insurance_rate}%)`
        }]);
      }

      // 2. Record Customer Payment
      if (values.amount > 0) {
        const { error: paymentError } = await supabase
            .from("payments")
            .insert([{ 
              clinic_id: profile?.clinic_id,
              invoice_id: invoice.id,
              amount: values.amount,
              method: values.method
            }]);
        if (paymentError) throw paymentError;
      }

      // 3. Update Invoice Status
      const totalPaidSoFar = (invoice.totalPaid || 0) + values.amount + (values.has_insurance ? values.insurance_amount : 0);
      const newStatus = totalPaidSoFar >= invoice.amount ? 'paid' : 'partial';
      
      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({ status: newStatus })
        .eq("id", invoice.id);

      if (invoiceError) throw invoiceError;

      // 4. Consultation Queue Integration
      if (newStatus === 'paid') {
        const { data: items } = await supabase.from("invoice_items").select("service_type").eq("invoice_id", invoice.id);
        const hasConsultation = items?.some(item => item.service_type?.toLowerCase().includes('consultation'));

        if (hasConsultation) {
          await supabase.from("appointments").insert([{
              clinic_id: profile?.clinic_id,
              patient_id: invoice.patient_id,
              status: 'en attente',
              start_time: new Date().toISOString(),
              reason: 'Consultation spontanée (après paiement)'
          }]);
        }
      }

      toast.success("Transaction enregistrée avec succès.");
      setOpen(false);
      onCreated();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "button" ? (
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-sm">
            <Wallet className="h-4 w-4" /> Encaisser
          </Button>
        ) : (
          <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground">
            Encaisser paiement
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="bg-emerald-600 p-6 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black flex items-center gap-2 text-white">
                  <CheckCircle2 className="h-6 w-6" /> Encaisser la Facture
                </DialogTitle>
                <DialogDescription className="text-emerald-100 opacity-90">
                  Enregistrement d'un paiement pour {invoice.patients?.first_name} {invoice.patients?.last_name}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                  <p className="text-[10px] uppercase font-bold text-emerald-200">Total Facture</p>
                  <p className="text-xl font-black">{invoice.amount?.toLocaleString()} F</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                  <p className="text-[10px] uppercase font-bold text-emerald-200">Reste à Payer</p>
                  <p className="text-xl font-black">{invoice.remaining_balance?.toLocaleString()} F</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 bg-white">
              {/* Insurance Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <Users className="h-5 w-5" />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-slate-700">Prise en charge Assurance ?</p>
                      <p className="text-[10px] text-slate-500">Appliquer un taux de couverture</p>
                   </div>
                </div>
                <FormField
                  control={form.control}
                  name="has_insurance"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {watchedHasInsurance && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                   <FormField
                    control={form.control}
                    name="insurance_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-slate-500">Organisme</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-50 border-slate-200">
                              <SelectValue placeholder="Choisir..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {insurances.map(ins => (
                              <SelectItem key={ins.id} value={ins.id}>{ins.nom_assurance}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="insurance_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-slate-500">Taux (%)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="bg-slate-50 border-slate-200" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="col-span-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex justify-between items-center mt-1">
                     <span className="text-xs font-bold text-indigo-700">Montant Couvert :</span>
                     <span className="font-black text-indigo-800">{form.watch("insurance_amount").toLocaleString()} F CFA</span>
                  </div>
                </div>
              )}

              <Separator className="opacity-50" />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase text-slate-500">Montant Versé Client</FormLabel>
                      <FormControl>
                        <div className="relative">
                           <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                           <Input type="number" {...field} className="pl-10 h-12 text-lg font-black border-emerald-200 focus:ring-emerald-500" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase text-slate-500">Mode de Paiement</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 bg-slate-50">
                            <SelectValue placeholder="Choisir..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="espèces">Espèces (Cash)</SelectItem>
                          <SelectItem value="mobile money">Mobile Money</SelectItem>
                          <SelectItem value="carte bancaire">Carte Bancaire</SelectItem>
                          <SelectItem value="virement">Virement</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Status Preview */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex justify-between items-center group">
                 <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Nouveau Statut</p>
                    <p className="text-lg font-black">
                       {((invoice.totalPaid || 0) + form.watch("amount") + (watchedHasInsurance ? form.watch("insurance_amount") : 0)) >= invoice.amount 
                         ? "Totalement Payé" 
                         : "Paiement Partiel"}
                    </p>
                 </div>
                 <Badge className={
                    ((invoice.totalPaid || 0) + form.watch("amount") + (watchedHasInsurance ? form.watch("insurance_amount") : 0)) >= invoice.amount 
                    ? "bg-emerald-500" : "bg-blue-500"
                 }>
                    {((invoice.totalPaid || 0) + form.watch("amount") + (watchedHasInsurance ? form.watch("insurance_amount") : 0)) >= invoice.amount 
                    ? "Soldé" : "Acompte"}
                 </Badge>
              </div>
            </div>

            <div className="p-6 pt-0 bg-white">
              <Button type="submit" disabled={loading} className="w-full h-14 text-lg font-bold gap-3 bg-emerald-600 hover:bg-emerald-700 shadow-xl transition-all active:scale-95">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />}
                Valider l'Encaissement
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
