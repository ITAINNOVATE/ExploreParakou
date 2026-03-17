"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { 
  Baby, 
  Search, 
  Plus, 
  Calendar, 
  Heart, 
  Activity,
  MoreVertical,
  ChevronRight,
  UserPlus,
  Loader2,
  Stethoscope,
  FileText,
  Building2,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { RegisterPregnancyModal } from "@/components/dashboard/register-pregnancy-modal";
import { RegisterBirthModal } from "@/components/dashboard/register-birth-modal";
import { PrenatalConsultationModal } from "@/components/dashboard/prenatal-consultation-modal";
import { MaternityPrescriptionModal } from "@/components/dashboard/maternity-prescription-modal";

export default function MaternityPage() {
  const [pregnancies, setPregnancies] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [births, setBirths] = useState<any[]>([]);
  const [waitingList, setWaitingList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("waiting");
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === "waiting") {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .or("initial_service.eq.Gynécologie,initial_service.eq.Maternité")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setWaitingList(data || []);
      } else if (activeTab === "pregnancies") {
        const { data, error } = await supabase
          .from("pregnancies")
          .select(`
            *,
            patients (first_name, last_name, dob)
          `)
          .eq('status', 'active')
          .order("created_at", { ascending: false });
        if (error) throw error;
        setPregnancies(data || []);
      } else if (activeTab === "births" || activeTab === "newborns") {
        const { data, error } = await supabase
          .from("births")
          .select(`
            *,
            pregnancies (
              patient_id,
              patients (first_name, last_name)
            )
          `)
          .order("delivery_date", { ascending: false });
        if (error) throw error;
        setBirths(data || []);
      } else if (activeTab === "consultations") {
        const { data, error } = await supabase
          .from("prenatal_consultations")
          .select(`
            *,
            pregnancies (
              patient_id,
              patients (first_name, last_name)
            )
          `)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setConsultations(data || []);
      } else if (activeTab === "prescriptions") {
        const { data, error } = await supabase
          .from("maternity_prescriptions")
          .select(`
            *,
            pregnancies (
              patient_id,
              patients (first_name, last_name)
            )
          `)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setPrescriptions(data || []);
      }
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredPregnancies = pregnancies.filter((p) => {
    const name = `${p.patients?.first_name} ${p.patients?.last_name}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const stats = [
    { 
      label: "En attente", 
      value: waitingList.length, 
      icon: Activity, 
      color: "text-amber-600", 
      bg: "bg-amber-100",
      description: "Patients orientés" 
    },
    { 
      label: "Grossesses Actives", 
      value: pregnancies.length, 
      icon: Heart, 
      color: "text-rose-600", 
      bg: "bg-rose-100",
      description: "Suivi en cours"
    },
    { 
      label: "Naissances (Mois)", 
      value: births.filter(b => b.delivery_date && new Date(b.delivery_date).getMonth() === new Date().getMonth()).length, 
      icon: Baby, 
      color: "text-blue-600", 
      bg: "bg-blue-100",
      description: "Nouveau-nés"
    },
    { 
      label: "Consultations (CPN)", 
      value: consultations.length, 
      icon: Stethoscope, 
      color: "text-emerald-600", 
      bg: "bg-emerald-100",
      description: "Total visites"
    }
  ];

  function calculateGestationWeeks(ddr: string) {
    if (!ddr) return 0;
    const start = new Date(ddr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks;
  }

  function EmptyState({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
    return (
      <div className="p-24 flex flex-col items-center justify-center text-center space-y-6 bg-slate-50/10">
        <div className="h-24 w-24 bg-white rounded-[2.5rem] flex items-center justify-center text-slate-200 shadow-xl shadow-slate-100 border border-slate-50 group transition-all duration-500">
          <Icon className="h-12 w-12 text-slate-300 group-hover:scale-110 transition-transform" />
        </div>
        <div className="space-y-2">
          <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{title}</h4>
          <p className="text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-rose-500 rounded-xl text-white shadow-lg shadow-rose-200">
               <Baby className="h-8 w-8" />
            </div>
            Maternité & Gynécologie
          </h1>
          <p className="text-slate-500 font-medium ml-1">Gestion complète du suivi prénatal et des nouveau-nés.</p>
        </div>

        <div className="flex items-center gap-3">
          <RegisterPregnancyModal onCreated={fetchData} />
          <RegisterBirthModal onCreated={fetchData} pregnancies={pregnancies} />
        </div>
      </div>

      {/* Stats Cards Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white overflow-hidden group border-b-4 border-transparent hover:border-slate-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-3 rounded-2xl transition-colors", stat.bg)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
                <div className="text-right">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                   <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <div className={cn("h-1.5 w-1.5 rounded-full", stat.bg.replace('bg-', 'bg-').replace('100', '600'))} />
                {stat.description}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs onValueChange={setActiveTab} className="space-y-6">
        <div className="space-y-4">
          <TabsList className="bg-transparent p-0 gap-3 h-auto flex-wrap">
            <TabsTrigger 
              value="pregnancies" 
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all shadow-sm
                bg-white border-pink-200 text-pink-600 hover:bg-pink-50
                data-[state=active]:bg-pink-600 data-[state=active]:text-white data-[state=active]:border-pink-600 data-[state=active]:shadow-md"
            >
              Suivi de Grossesse
            </TabsTrigger>
            <TabsTrigger 
              value="consultations" 
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all shadow-sm
                bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50
                data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-indigo-600 data-[state=active]:shadow-md"
            >
              Consultations (CPN)
            </TabsTrigger>
            <TabsTrigger 
              value="prescriptions" 
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all shadow-sm
                bg-white border-purple-200 text-purple-600 hover:bg-purple-50
                data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-purple-600 data-[state=active]:shadow-md"
            >
              Prescriptions
            </TabsTrigger>
            <TabsTrigger 
              value="births" 
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all shadow-sm
                bg-white border-blue-200 text-blue-600 hover:bg-blue-50
                data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=active]:shadow-md"
            >
              Accouchements
            </TabsTrigger>
            <TabsTrigger 
              value="newborns" 
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all shadow-sm
                bg-white border-sky-200 text-sky-600 hover:bg-sky-50
                data-[state=active]:bg-sky-600 data-[state=active]:text-white data-[state=active]:border-sky-600 data-[state=active]:shadow-md"
            >
              Nouveau-nés
            </TabsTrigger>
          </TabsList>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-200/60 shadow-sm">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher une patiente..."
                className="pl-10 bg-white border-slate-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              {activeTab === "pregnancies" && <RegisterPregnancyModal onCreated={fetchData} />}
              {activeTab === "consultations" && <PrenatalConsultationModal onCreated={fetchData} pregnancies={pregnancies} />}
              {activeTab === "prescriptions" && <MaternityPrescriptionModal onCreated={fetchData} pregnancies={pregnancies} />}
              {activeTab === "births" && <RegisterBirthModal onCreated={fetchData} pregnancies={pregnancies} />}
            </div>
          </div>
        </div>

        <TabsContent value="pregnancies" className="border rounded-lg bg-white shadow-sm text-sm">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="min-w-[150px]">Patiente</TableHead>
                  <TableHead className="hidden md:table-cell">Dernières Règles (DDR)</TableHead>
                  <TableHead>Terme Prévu (DPA)</TableHead>
                  <TableHead className="hidden sm:table-cell">Âge Gestationnel</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : filteredPregnancies.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-500 italic">Aucun dossier trouvé.</TableCell></TableRow>
                ) : filteredPregnancies.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium">
                      <div>
                        {p.patients?.first_name} {p.patients?.last_name}
                        <div className="md:hidden text-xs text-muted-foreground mt-1">
                          LMP: {p.lmp_date ? format(new Date(p.lmp_date), "dd/MM/yy") : "-"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 hidden md:table-cell">
                      {p.lmp_date ? format(new Date(p.lmp_date), "dd MMM yyyy", { locale: fr }) : "-"}
                    </TableCell>
                    <TableCell className="text-slate-600 font-semibold">
                      {p.edd ? format(new Date(p.edd), "dd MMM yyyy", { locale: fr }) : "-"}
                      <div className="sm:hidden mt-1">
                        <Badge variant="secondary" className="bg-pink-50 text-pink-700 text-[10px] px-1 h-4">
                          {p.gestational_age || "N/A"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className="bg-pink-50 text-pink-700 hover:bg-pink-100 border-pink-100 italic">
                        {p.gestational_age || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>} />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Voir le carnet</DropdownMenuItem>
                          <DropdownMenuItem>Planifier CPN</DropdownMenuItem>
                          <DropdownMenuItem className="text-primary font-medium">Enregistrer Accouchement</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="births" className="border rounded-lg bg-white shadow-sm text-sm">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="min-w-[120px]">Date & Heure</TableHead>
                  <TableHead>Mère</TableHead>
                  <TableHead>Sexe</TableHead>
                  <TableHead>Poids / Taille</TableHead>
                  <TableHead>Apgar</TableHead>
                  <TableHead className="hidden lg:table-cell">Type Accouch.</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : births.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-500 italic">Aucune naissance enregistrée.</TableCell></TableRow>
                ) : births.map((b) => (
                  <TableRow key={b.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-slate-600">
                      {b.delivery_date ? format(new Date(b.delivery_date), "dd/MM/yy HH:mm", { locale: fr }) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-800">
                        {b.pregnancies?.patients?.first_name} {b.pregnancies?.patients?.last_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={b.baby_gender === 'M' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-pink-50 text-pink-700 border-pink-200"}>
                        {b.baby_gender === 'M' ? "Masculin" : "Féminin"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-700">
                      {b.baby_weight}kg / {b.baby_height || "-"}cm
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100">
                         {b.apgar_score || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 hidden lg:table-cell">{b.type}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="consultations" className="border rounded-lg bg-white shadow-sm text-sm">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patiente</TableHead>
                  <TableHead>Vitals (TA / Poids / BCF)</TableHead>
                  <TableHead>Examen Clinique</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : consultations.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-500 italic">Aucune consultation enregistrée.</TableCell></TableRow>
                ) : consultations.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-slate-600">
                      {format(new Date(c.created_at), "dd/MM/yy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {c.pregnancies?.patients?.first_name} {c.pregnancies?.patients?.last_name}
                    </TableCell>
                    <TableCell>
                       <div className="flex gap-2">
                          <Badge variant="outline" className="bg-slate-50">{c.vitals?.bp || "-"}</Badge>
                          <Badge variant="outline" className="bg-slate-50">{c.vitals?.weight || "-"}kg</Badge>
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100">{c.vitals?.fetal_heart_rate || "-"}</Badge>
                       </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-slate-500 italic">
                       {c.clinical_exam}
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

        <TabsContent value="prescriptions" className="border rounded-lg bg-white shadow-sm text-sm">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patiente</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Détails</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : prescriptions.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-500 italic">Aucune prescription trouvée.</TableCell></TableRow>
                ) : prescriptions.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-slate-600">
                      {format(new Date(p.created_at), "dd/MM/yy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {p.pregnancies?.patients?.first_name} {p.pregnancies?.patients?.last_name}
                    </TableCell>
                    <TableCell>
                       <Badge className={cn(
                          p.type === 'medication' ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border-none" :
                          p.type === 'laboratory' ? "bg-purple-100 text-purple-700 hover:bg-purple-200 border-none" :
                          "bg-amber-100 text-amber-700 hover:bg-amber-200 border-none"
                       )}>
                          {p.type === 'medication' ? "Médicaments" : p.type === 'laboratory' ? "Laboratoire" : "Hospitalisation"}
                       </Badge>
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate text-slate-500">
                       {p.type === 'medication' && p.details?.medications?.map((m: any) => m.name).join(", ")}
                       {p.type === 'laboratory' && p.details?.lab_tests?.map((l: any) => l.name).join(", ")}
                       {p.type === 'hospitalization' && p.details?.reason}
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

        <TabsContent value="newborns" className="border rounded-lg bg-white shadow-sm text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
             {loading ? (
               <div className="col-span-full py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
             ) : births.length === 0 ? (
               <div className="col-span-full py-10 text-center text-slate-500 italic border rounded-xl bg-slate-50/50">Aucun nouveau-né enregistré.</div>
             ) : births.map((b) => (
               <Card key={b.id} className="overflow-hidden border-slate-200 hover:shadow-md transition-shadow">
                  <div className={cn("h-1", b.baby_gender === 'M' ? "bg-blue-500" : "bg-pink-500")} />
                  <CardContent className="p-4">
                     <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nouveau-né</span>
                           <h4 className="font-bold text-slate-800">
                             {b.baby_gender === 'M' ? "Bébé G." : "Bébé F."} {b.pregnancies?.patients?.last_name}
                           </h4>
                        </div>
                        <Badge variant="outline" className={cn("text-[10px] h-5", b.baby_gender === 'M' ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700")}>
                           {b.baby_gender === 'M' ? "Masculin" : "Féminin"}
                        </Badge>
                     </div>
                     <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-100 my-3">
                        <div>
                           <p className="text-[10px] font-medium text-slate-400">Poids</p>
                           <p className="font-bold text-slate-700">{b.baby_weight} kg</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-medium text-slate-400">Taille</p>
                           <p className="font-bold text-slate-700">{b.baby_height || "-"} cm</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-medium text-slate-400">Score Apgar</p>
                           <p className="font-bold text-slate-700">{b.apgar_score || "-"}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-medium text-slate-400">Date Naissance</p>
                           <p className="font-bold text-slate-700">{format(new Date(b.delivery_date), "dd/MM/yy")}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2 mt-3 pt-1">
                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">M</div>
                        <p className="text-xs text-slate-600">Mère: <span className="font-medium">{b.pregnancies?.patients?.first_name} {b.pregnancies?.patients?.last_name}</span></p>
                     </div>
                  </CardContent>
               </Card>
             ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
