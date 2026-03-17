"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { 
  CreditCard, 
  Search, 
  Plus, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreVertical,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  Receipt
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BillingForm } from "@/components/dashboard/billing-form";
import { RecordPaymentModal } from "@/components/dashboard/record-payment-modal";

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState("new");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (activeTab !== "new") {
      fetchData();
    }
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === "invoices") {
        const { data, error } = await supabase
          .from("invoices")
          .select(`
            *,
            patients (first_name, last_name)
          `)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setInvoices(data || []);
      } else if (activeTab === "payments") {
        const { data, error } = await supabase
          .from("payments")
          .select(`
            *,
            invoices (
              patient_id,
              patients (first_name, last_name)
            )
          `)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setPayments(data || []);
      }
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Payé</Badge>;
      case "partial":
        return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200"><Clock className="w-3 h-3 mr-1" /> Partiel</Badge>;
      case "unpaid":
        return <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-200"><AlertCircle className="w-3 h-3 mr-1" /> Impayé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const patientName = `${inv.patients?.first_name} ${inv.patients?.last_name}`.toLowerCase();
    return patientName.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col">
      <div className="p-6 pb-2 space-y-2 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Receipt className="h-8 w-8 text-primary" />
              Module de Facturation
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Sélectionnez un patient et ses prestations pour générer une facture immédiate.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="new" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4 shrink-0">
          <TabsList className="bg-slate-100/80 p-1 border border-slate-200">
            <TabsTrigger value="new" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
              <Plus className="w-4 h-4" /> Nouvelle Facture
            </TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
              <FileText className="w-4 h-4" /> Factures Patients
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
              <CreditCard className="w-4 h-4" /> Caisse
            </TabsTrigger>
          </TabsList>
          
          {activeTab !== "new" && (
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher un patient..."
                className="pl-10 bg-white border-slate-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>

        <TabsContent value="new" className="flex-1 overflow-hidden border rounded-t-xl bg-white shadow-sm mt-0 focus-visible:ring-0">
          <BillingForm onSuccess={() => setActiveTab("invoices")} />
        </TabsContent>

        <TabsContent value="invoices" className="flex-1 overflow-auto border rounded-t-xl bg-white shadow-sm mt-0">
          <Table className="min-w-[800px] md:min-w-full">
            <TableHeader className="bg-slate-50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="hidden md:table-cell">Numéro</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="hidden lg:table-cell">Service</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Chargement...</TableCell></TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Aucune facture trouvée.</TableCell></TableRow>
              ) : filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                  <TableCell className="font-mono text-xs text-slate-500 uppercase hidden md:table-cell">
                    #{invoice.id.substring(0, 8)}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    <div className="flex flex-col">
                      <span>{invoice.patients?.first_name} {invoice.patients?.last_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono uppercase md:hidden">#{invoice.id.substring(0, 8)}</span>
                      <span className="text-[10px] text-slate-500 lg:hidden">{invoice.service_type || "Consultation"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600 hidden lg:table-cell">{invoice.service_type || "Consultation"}</TableCell>
                  <TableCell className="font-semibold text-slate-800 whitespace-nowrap">
                    {invoice.amount.toLocaleString()} F CFA
                  </TableCell>
                  <TableCell className="text-slate-600 whitespace-nowrap">
                    {format(new Date(invoice.created_at), "dd MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      } />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Voir la facture</DropdownMenuItem>
                        <DropdownMenuItem>Imprimer PDF</DropdownMenuItem>
                        {invoice.status !== 'paid' && (
                          <RecordPaymentModal invoice={invoice} onCreated={fetchData} />
                        )}
                        <DropdownMenuItem className="text-rose-600">Annuler facture</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="payments" className="flex-1 overflow-auto border rounded-t-xl bg-white shadow-sm mt-0">
          <Table className="min-w-[700px] md:min-w-full">
            <TableHeader className="bg-slate-50 sticky top-0 z-10">
              <TableRow>
                <TableHead>Date & Heure</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Montant Versé</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Facture Ref.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Chargement...</TableCell></TableRow>
              ) : payments.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Aucun paiement enregistré.</TableCell></TableRow>
              ) : payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-slate-600 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{format(new Date(payment.created_at), "dd MMM yyyy", { locale: fr })}</span>
                      <span className="text-[10px] text-slate-400">{format(new Date(payment.created_at), "HH:mm")}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{payment.invoices?.patients?.first_name} {payment.invoices?.patients?.last_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono uppercase sm:hidden">#{payment.invoice_id.substring(0, 8)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-slate-50 uppercase text-[10px] whitespace-nowrap">{payment.method}</Badge>
                  </TableCell>
                  <TableCell className="font-bold text-emerald-600 whitespace-nowrap">
                    {payment.amount.toLocaleString()} F CFA
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-slate-400 hidden sm:table-cell">
                    #{payment.invoice_id.substring(0, 8)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
