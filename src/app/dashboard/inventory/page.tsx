"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { 
  Package, 
  Search, 
  Plus, 
  History, 
  AlertTriangle,
  ArrowRightLeft,
  ClipboardList,
  Filter,
  MoreVertical,
  Truck,
  Layers,
  ShoppingBag,
  Loader2,
  Calendar,
  CheckCircle2,
  Clock
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
import { MultiItemReceptionModal } from "@/components/dashboard/multi-item-reception-modal";
import { MultiItemTransferModal } from "@/components/dashboard/multi-item-transfer-modal";
import { InventoryStocktakeModal } from "@/components/dashboard/inventory-stocktake-modal";

const supabase = createClient();

export default function CentralStorePage() {
  const [activeTab, setActiveTab] = useState("stock");
  const [stock, setStock] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [inventories, setInventories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Remove fixed widths – layout adapts to zoom

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "stock") {
        const { data, error } = await supabase
          .from("central_stock")
          .select(`
            *,
            medicines (id, name, category, dosage, form, code_medicament),
            suppliers (name)
          `)
          .order("medicines(name)", { ascending: true });
        
        if (error) throw error;
        setStock(data || []);
      } else if (activeTab === "transfers") {
        const { data, error } = await supabase
          .from("stock_transfers")
          .select(`
            *,
            medicines (name, dosage, form)
          `)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setTransfers(data || []);
      } else if (activeTab === "inventories") {
        const { data, error } = await supabase
          .from("inventories")
          .select("*")
          .order("date_inventaire", { ascending: false });
        if (error) throw error;
        setInventories(data || []);
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

  const getStockStatus = (quantity: number, expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const monthsUntilExpiry = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (quantity <= 0) return <Badge variant="destructive">Rupture</Badge>;
    if (monthsUntilExpiry < 3) return <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-200">Expirant bientôt</Badge>;
    if (quantity < 50) return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">Stock faible</Badge>;
    return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">En stock</Badge>;
  };

  const filteredStock = stock.filter(item => 
    item.medicines?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.medicines?.code_medicament?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.batch_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.bordereau_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.suppliers?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 min-w-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Magasin Central
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion des réceptions, transferts inter-services et inventaires physiques.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2 text-slate-600">
            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center justify-between">
              Total Lots en Stock
              <Layers className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{stock.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2 text-slate-600">
            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center justify-between">
              Alertes Péremption
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {stock.filter(s => {
                const diff = (new Date(s.expiry_date).getTime() - new Date().getTime()) / (1000*60*60*24*30);
                return diff < 3;
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2 text-slate-600">
            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center justify-between">
              Transferts en cours
              <ArrowRightLeft className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {transfers.filter(t => t.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs onValueChange={setActiveTab} className="space-y-6 flex flex-col">
        <div className="space-y-4">
          <TabsList className="bg-transparent p-0 gap-3 h-auto flex-wrap">
            <TabsTrigger
              value="stock"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all shadow-sm
                bg-white border-blue-200 text-blue-600 hover:bg-blue-50
                data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=active]:shadow-md"
            >
              <Package className="h-4 w-4" /> État du Stock
            </TabsTrigger>
            <TabsTrigger
              value="transfers"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all shadow-sm
                bg-white border-amber-300 text-amber-600 hover:bg-amber-50
                data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:border-amber-500 data-[state=active]:shadow-md"
            >
              <ArrowRightLeft className="h-4 w-4" /> Transferts
            </TabsTrigger>
            <TabsTrigger
              value="inventories"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all shadow-sm
                bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50
                data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:border-emerald-600 data-[state=active]:shadow-md"
            >
              <ClipboardList className="h-4 w-4" /> Inventaires
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-200/60 shadow-sm">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher un médicament, un lot, un BL..."
                className="pl-10 bg-white border-slate-200 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              {activeTab === "stock" && (
                <MultiItemReceptionModal onCreated={fetchData} />
              )}
              {activeTab === "transfers" && (
                <MultiItemTransferModal onCreated={fetchData} />
              )}
              {activeTab === "inventories" && (
                <InventoryStocktakeModal onCreated={fetchData} />
              )}
            </div>
          </div>
        </div>

        <TabsContent value="stock" className="border rounded-lg bg-white shadow-sm text-sm">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Médicament</TableHead>
                  <TableHead>Lot & Réception</TableHead>
                  <TableHead>Expiration & Statut</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : filteredStock.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-500">Aucun médicament trouvé.</TableCell></TableRow>
                ) : filteredStock.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {item.medicines?.code_medicament && (
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                            {item.medicines.code_medicament}
                          </span>
                        )}
                        <span className="font-bold text-slate-900 leading-tight">{item.medicines?.name}</span>
                        <span className="text-[11px] text-slate-400">{item.medicines?.dosage} — {item.medicines?.form}</span>
                        {item.suppliers?.name && (
                          <span className="text-[10px] text-slate-400 italic">{item.suppliers.name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-xs font-bold text-slate-700">{item.batch_number || "---"}</span>
                        {item.reception_date && (
                          <span className="text-[10px] text-slate-500">Réception : {format(new Date(item.reception_date), "dd/MM/yyyy")}</span>
                        )}
                        {item.bordereau_number && (
                          <span className="text-[10px] text-slate-400 font-mono">BL : {item.bordereau_number}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.expiry_date ? (
                        <div className="flex flex-col gap-1">
                          <span className={
                            (new Date(item.expiry_date).getTime() - new Date().getTime()) / (1000*60*60*24*30) < 3
                              ? "text-rose-600 font-bold text-xs"
                              : "text-slate-600 text-xs font-medium"
                          }>
                            {format(new Date(item.expiry_date), "dd/MM/yyyy")}
                          </span>
                          {getStockStatus(item.quantity, item.expiry_date)}
                        </div>
                      ) : <span className="text-slate-300 text-xs">---</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-slate-800 text-base">{item.quantity?.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 ml-1">U</span>
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
                  <TableHead>Date</TableHead>
                  <TableHead>Médicament</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : transfers.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-500">Aucun transfert enregistré.</TableCell></TableRow>
                ) : transfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-slate-500">
                      {format(new Date(t.created_at), "dd/MM HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold">{t.medicines?.name}</div>
                      <div className="text-[10px] text-slate-400">{t.medicines?.dosage}</div>
                    </TableCell>
                    <TableCell className="font-mono">{t.quantity}</TableCell>
                    <TableCell className="capitalize">{t.destination}</TableCell>
                    <TableCell>
                      {t.status === 'pending' ? (
                        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">En attente</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">Terminé</Badge>
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

        <TabsContent value="inventories" className="border rounded-lg bg-white shadow-sm text-sm">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Nom de l'inventaire</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventories.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-bold">{inv.inventory_name}</TableCell>
                    <TableCell>{format(new Date(inv.date_inventaire), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-slate-500 text-xs italic truncate max-w-xs">{inv.notes || "---"}</TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Validé</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <History className="h-4 w-4" /> Détails
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
