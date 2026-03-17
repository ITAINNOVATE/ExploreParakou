"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { 
  Pill, 
  Search, 
  Plus, 
  History, 
  TrendingUp,
  Package,
  ShoppingCart,
  Users,
  MoreVertical,
  ArrowUpRight,
  ClipboardCheck,
  Loader2,
  ArrowRightLeft
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
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
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DispenseMedicineModal } from "@/components/dashboard/dispense-medicine-modal";

const supabase = createClient();

export default function PharmacyPage() {
  const [activeTab, setActiveTab] = useState("sales");
  const [sales, setSales] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "sales") {
        const { data, error } = await supabase
          .from("pharmacy_sales")
          .select(`
            *,
            patients (first_name, last_name)
          `)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setSales(data || []);
      } else if (activeTab === "stock") {
        const { data, error } = await supabase
          .from("pharmacy_stock")
          .select(`
            *,
            medicines (name, category, dosage, form, code_medicament)
          `)
          .order("quantity", { ascending: true });
        if (error) throw error;
        setStock(data || []);
      } else if (activeTab === "transfers") {
        const { data, error } = await supabase
          .from("stock_transfers")
          .select(`
            *,
            medicines (name, dosage, form)
          `)
          .eq("destination", "pharmacy")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setIncomingTransfers(data || []);
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCompleteTransfer = async (transferId: string, medicineId: string, quantity: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // 1. Check if item exists in pharmacy stock
      const { data: existingStock, error: stockFetchError } = await supabase
        .from("pharmacy_stock")
        .select("*")
        .eq("medicine_id", medicineId)
        .single();
      
      if (stockFetchError && stockFetchError.code !== 'PGRST116') throw stockFetchError;

      if (existingStock) {
        // Update existing stock
        const { error: updateError } = await supabase
          .from("pharmacy_stock")
          .update({ quantity: existingStock.quantity + quantity })
          .eq("id", existingStock.id);
        if (updateError) throw updateError;
      } else {
        // Get clinic_id
        const { data: profile } = await supabase.from('profiles').select('clinic_id').eq('id', user.id).single();
        // Create new entry in pharmacy stock
        const { error: insertError } = await supabase
          .from("pharmacy_stock")
          .insert([{
            medicine_id: medicineId,
            quantity: quantity,
            clinic_id: profile?.clinic_id
          }]);
        if (insertError) throw insertError;
      }

      // 2. Mark transfer as completed
      const { error: transferError } = await supabase
        .from("stock_transfers")
        .update({ status: "completed", completed_by: user.id })
        .eq("id", transferId);
      
      if (transferError) throw transferError;

      toast.success("Transfert réceptionné dans le stock de la pharmacie");
      fetchData();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    }
  };

  const filteredSales = sales.filter((s) => {
    const patientName = `${s.patients?.first_name} ${s.patients?.last_name}`.toLowerCase();
    return patientName.includes(searchQuery.toLowerCase());
  });

  const filteredStock = stock.filter((st) => {
    const medName = st.medicines?.name.toLowerCase();
    const medCode = st.medicines?.code_medicament?.toLowerCase() || "";
    return medName.includes(searchQuery.toLowerCase()) || medCode.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="p-6 space-y-6 min-w-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Pill className="h-8 w-8 text-primary" />
            Pharmacie Hospitalière
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez la dispense des médicaments, les ventes et le stock local.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <DispenseMedicineModal onCreated={fetchData} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2 text-slate-600">
            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center justify-between">
              Ventes du Jour
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {sales.filter(s => format(new Date(s.created_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))
                .reduce((acc, curr) => acc + curr.total_amount, 0).toLocaleString()} F CFA
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2 text-slate-600">
            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center justify-between">
              Alertes Stock Local
              <Package className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {stock.filter(s => s.quantity < 20).length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2 text-slate-600">
            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center justify-between">
              Transferts en attente
              <ArrowRightLeft className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {incomingTransfers.filter(t => t.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs onValueChange={setActiveTab} className="space-y-6 flex flex-col">
        <div className="space-y-4">
          <TabsList className="bg-transparent p-0 gap-3 h-auto flex-wrap">
            <TabsTrigger 
              value="sales" 
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all shadow-sm
                bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50
                data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:border-emerald-600 data-[state=active]:shadow-md"
            >
              <History className="h-4 w-4" /> Ventes
            </TabsTrigger>
            <TabsTrigger 
              value="stock" 
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all shadow-sm
                bg-white border-amber-200 text-amber-600 hover:bg-amber-50
                data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:border-amber-500 data-[state=active]:shadow-md"
            >
              <Package className="h-4 w-4" /> Stock local
            </TabsTrigger>
            <TabsTrigger 
              value="transfers" 
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all shadow-sm
                bg-white border-blue-200 text-blue-600 hover:bg-blue-50
                data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=active]:shadow-md"
            >
              <ArrowRightLeft className="h-4 w-4" /> Arrivages
            </TabsTrigger>
          </TabsList>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-200/60 shadow-sm">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher une vente, un médicament, un lot..."
                className="pl-10 bg-white border-slate-200 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              {activeTab === "sales" && (
                <Button onClick={() => setIsDispenseModalOpen(true)} className="gap-2 shadow-md">
                  <Pill className="h-4 w-4" /> Nouvelle Vente
                </Button>
              )}
            </div>
          </div>
        </div>

        <TabsContent value="sales" className="border rounded-lg bg-white shadow-sm text-sm">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Date & Heure</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead className="text-right">Montant Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : filteredSales.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-500 italic">Aucune vente enregistrée.</TableCell></TableRow>
                ) : filteredSales.map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-slate-600">
                      {format(new Date(sale.created_at), "dd MMM HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">
                      {sale.patients?.first_name} {sale.patients?.last_name || "Anonyme"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {sale.items?.map((i: any) => `${i.name} (x${i.qty})`).join(', ')}
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      {sale.total_amount.toLocaleString()} F
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="stock" className="border rounded-lg bg-white shadow-sm text-sm">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Désignation & Code</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : filteredStock.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-500 italic">Aucun stock local trouvé.</TableCell></TableRow>
                ) : filteredStock.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-indigo-600 italic uppercase">
                          {item.medicines?.code_medicament || "---"}
                        </span>
                        <span className="font-bold text-slate-900">{item.medicines?.name}</span>
                        <span className="text-[10px] text-slate-500">{item.medicines?.dosage}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] font-bold uppercase text-slate-500">{item.medicines?.category}</TableCell>
                    <TableCell className="text-right font-bold text-slate-700">{item.quantity} U</TableCell>
                    <TableCell>
                      {item.quantity < 20 ? (
                        <Badge variant="destructive">Critique</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100">Suffisant</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="transfers" className="border rounded-lg bg-white shadow-sm text-sm">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Date Arrivée</TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomingTransfers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-500">Aucun arrivage en cours.</TableCell></TableRow>
                ) : incomingTransfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-slate-500">{format(new Date(t.created_at), "dd/MM HH:mm")}</TableCell>
                    <TableCell className="font-bold">{t.medicines?.name}</TableCell>
                    <TableCell className="font-mono font-bold">{t.quantity} U</TableCell>
                    <TableCell>
                      {t.status === 'pending' ? (
                        <Badge className="bg-amber-100 text-amber-700">En transit</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700">Réceptionné</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.status === 'pending' && (
                        <Button 
                          size="sm" 
                          className="bg-primary hover:bg-primary/90 gap-2"
                          onClick={() => handleCompleteTransfer(t.id, t.medicine_id, t.quantity)}
                        >
                          Valider réception
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <DispenseMedicineModal 
        isOpen={isDispenseModalOpen} 
        onOpenChange={setIsDispenseModalOpen}
        onDispensed={fetchData}
      />
    </div>
  );
}
