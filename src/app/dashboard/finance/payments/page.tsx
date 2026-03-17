"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Wallet, 
  Loader2, 
  Filter, 
  Download, 
  ArrowUpRight, 
  Banknote, 
  Smartphone, 
  CreditCard,
  User,
  History,
  CheckCircle2,
  FileText,
  Clock,
  AlertCircle,
  Receipt
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RecordPaymentModal } from "@/components/dashboard/record-payment-modal";

const supabase = createClient();

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [payRes, invRes] = await Promise.all([
        supabase
          .from("payments")
          .select(`*, invoices(amount, patients(first_name, last_name))`)
          .order("created_at", { ascending: false }),
        supabase
          .from("invoices")
          .select(`
            *, 
            patients(first_name, last_name, identifier),
            payments(amount)
          `)
          .in("status", ["pending", "partial"])
          .order("created_at", { ascending: false })
      ]);

      if (payRes.error) throw payRes.error;
      if (invRes.error) throw invRes.error;

      setPayments(payRes.data || []);
      
      // Calculate remaining balance for each invoice
      const enrichedInvoices = (invRes.data || []).map(inv => {
        const totalPaid = inv.payments?.reduce((acc: number, p: any) => acc + (p.amount || 0), 0) || 0;
        return {
          ...inv,
          totalPaid,
          balance: inv.amount - totalPaid
        };
      });
      setPendingInvoices(enrichedInvoices);

    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredInvoices = useMemo(() => {
    return pendingInvoices.filter(inv => {
      const name = `${inv.patients?.first_name} ${inv.patients?.last_name}`.toLowerCase();
      return name.includes(searchQuery.toLowerCase()) || inv.patients?.identifier?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [pendingInvoices, searchQuery]);

  const filteredPayments = useMemo(() => {
    return payments.filter(pay => {
      const name = `${pay.invoices?.patients?.first_name} ${pay.invoices?.patients?.last_name}`.toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    });
  }, [payments, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "partial":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1"><Clock className="w-3 h-3" /> Partiel</Badge>;
      case "pending":
      case "unpaid":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1"><AlertCircle className="w-3 h-3" /> En attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header Section */}
      <div className="p-6 pb-2 space-y-2 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Wallet className="h-8 w-8 text-emerald-600" />
              Gestion de la Caisse
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Enregistrez les encaissements et gérez les factures en instance de paiement.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Card className="border-none shadow-sm bg-slate-900 text-white px-4 py-2 flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Encaissé</span>
                <span className="text-xl font-black">
                   {new Intl.NumberFormat('fr-FR').format(payments.reduce((acc, p) => acc + p.amount, 0))} F
                </span>
              </div>
              <TrendingUp className="h-6 w-6 text-emerald-400 opacity-50" />
            </Card>
          </div>
        </div>
      </div>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4 shrink-0">
          <TabsList className="bg-slate-100/80 p-1 border border-slate-200">
            <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
              <Clock className="w-4 h-4" /> Factures en Instance
              {pendingInvoices.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700 hover:bg-amber-100">{pendingInvoices.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="journal" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
              <History className="w-4 h-4" /> Journal de Caisse
            </TabsTrigger>
          </TabsList>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher patient..."
              className="pl-10 bg-white border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="pending" className="flex-1 overflow-auto border rounded-t-xl bg-white shadow-sm mt-0">
          <Table className="min-w-[800px] md:min-w-full">
            <TableHeader className="bg-slate-50 sticky top-0 z-10">
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Date Facture</TableHead>
                <TableHead className="text-right">Montant Total</TableHead>
                <TableHead className="text-right">Déjà Payé</TableHead>
                <TableHead className="text-right">Reste à Payer</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary"/></TableCell></TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20 text-slate-400 italic">Aucune facture en attente.</TableCell></TableRow>
              ) : (
                filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                          {inv.patients?.last_name?.[0]}{inv.patients?.first_name?.[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{inv.patients?.last_name} {inv.patients?.first_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">#{inv.id.substring(0, 8)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {format(new Date(inv.created_at), "dd MMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-600">
                      {inv.amount.toLocaleString()} F
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      {inv.totalPaid.toLocaleString()} F
                    </TableCell>
                    <TableCell className="text-right font-black text-slate-900">
                      {inv.balance.toLocaleString()} F
                    </TableCell>
                    <TableCell>{getStatusBadge(inv.status)}</TableCell>
                    <TableCell className="text-right">
                       <RecordPaymentModal 
                         invoice={{
                           ...inv,
                           remaining_balance: inv.balance
                         }} 
                         onCreated={fetchData} 
                         variant="button"
                       />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="journal" className="flex-1 overflow-auto border rounded-t-xl bg-white shadow-sm mt-0">
          <Table className="min-w-[800px] md:min-w-full">
            <TableHeader className="bg-slate-50 sticky top-0 z-10">
              <TableRow>
                <TableHead>Date & Heure</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Réf. Facture</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary"/></TableCell></TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-400 italic">Aucun paiement enregistré.</TableCell></TableRow>
              ) : (
                filteredPayments.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{format(new Date(p.created_at), "dd MMM yyyy", { locale: fr })}</span>
                        <span className="text-slate-400 font-mono">{format(new Date(p.created_at), "HH:mm")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-700">
                      {p.invoices?.patients?.last_name} {p.invoices?.patients?.first_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1.5 capitalize font-medium border-slate-200">
                        {p.method === 'espèces' && <Banknote className="h-3 w-3 text-emerald-500" />}
                        {p.method === 'mobile money' && <Smartphone className="h-3 w-3 text-orange-500" />}
                        {p.method === 'carte bancaire' && <CreditCard className="h-3 w-3 text-blue-500" />}
                        {p.method}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-emerald-600">
                      {p.amount.toLocaleString()} F
                    </TableCell>
                    <TableCell className="text-right font-mono text-[10px] text-slate-400 uppercase">
                      #{p.invoice_id?.substring(0, 8)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TrendingUp(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}
