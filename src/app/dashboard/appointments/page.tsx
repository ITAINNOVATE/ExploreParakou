"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, MoreHorizontal, Loader2, Calendar as CalendarIcon, Clock, List } from "lucide-react";
import { CreateAppointmentModal } from "@/components/dashboard/create-appointment-modal";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function AppointmentsPage() {
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const supabase = createClient();

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patients (
            first_name,
            last_name
          )
        `)
        .order("start_time", { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      toast.error("Erreur lors de la récupération des rendez-vous: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const filteredAppointments = appointments.filter(apt => {
    const fullName = `${apt.patients?.first_name} ${apt.patients?.last_name}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "en attente":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">En attente</Badge>;
      case "confirmé":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Confirmé</Badge>;
      case "annulé":
        return <Badge variant="destructive">Annulé</Badge>;
      case "terminé":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Terminé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calendar Logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="p-6 space-y-6 min-w-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-primary" />
            Agenda des Rendez-vous
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez l'emploi du temps médical et le suivi des visites patients.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2 text-slate-600">
            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center justify-between">
              Rendez-vous du Jour
              <CalendarIcon className="h-4 w-4 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {appointments.filter(a => isSameDay(new Date(a.start_time), new Date())).length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2 text-slate-600">
            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center justify-between">
              En attente
              <Clock className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {appointments.filter(a => a.status === 'en attente').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2 text-slate-600">
            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center justify-between">
              Taux d'occupation
              <List className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {Math.min(100, Math.round((appointments.filter(a => isSameDay(new Date(a.start_time), new Date())).length / 20) * 100))}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="space-y-6 flex flex-col" onValueChange={setView}>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <TabsList className="bg-transparent p-0 gap-3 h-auto flex-wrap">
              <TabsTrigger
                value="list"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all shadow-sm
                  bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50
                  data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-indigo-600 data-[state=active]:shadow-md"
              >
                <List className="h-4 w-4" /> Liste des RDV
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all shadow-sm
                  bg-white border-blue-200 text-blue-600 hover:bg-blue-50
                  data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=active]:shadow-md"
              >
                <CalendarIcon className="h-4 w-4" /> Calendrier
              </TabsTrigger>
            </TabsList>

            {view === "calendar" && (
              <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <MoreHorizontal className="h-4 w-4 rotate-180" />
                </Button>
                <h2 className="text-sm font-bold min-w-[120px] text-center capitalize text-slate-700">
                  {format(currentMonth, "MMMM yyyy", { locale: fr })}
                </h2>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-200/60 shadow-sm">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher un patient par nom..."
                className="pl-10 bg-white border-slate-200 shadow-sm h-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <CreateAppointmentModal onAppointmentCreated={fetchAppointments} />
            </div>
          </div>
        </div>

        <TabsContent value="list" className="border rounded-lg bg-white shadow-sm text-sm">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="py-4">Patient</TableHead>
                  <TableHead>Date & Heure</TableHead>
                  <TableHead className="hidden md:table-cell">Motif</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="h-48 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : filteredAppointments.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-48 text-center text-muted-foreground">Aucun rendez-vous trouvé.</TableCell></TableRow>
                ) : (
                  filteredAppointments.map((apt) => (
                    <TableRow key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-[10px]">
                            {apt.patients?.first_name?.[0]}{apt.patients?.last_name?.[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{apt.patients?.first_name} {apt.patients?.last_name}</span>
                            <span className="text-[10px] text-muted-foreground md:hidden truncate max-w-[120px]">{apt.reason || "Consultation"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-900 font-medium whitespace-nowrap text-xs">{format(new Date(apt.start_time), "dd MMM yyyy", { locale: fr })}</span>
                          <span className="text-slate-500 text-[11px] flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(apt.start_time), "HH:mm")}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-slate-600 hidden md:table-cell text-xs">{apt.reason || "Consultation Générale"}</TableCell>
                      <TableCell>{getStatusBadge(apt.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 hidden sm:flex font-bold text-[11px] px-3 rounded-lg"
                            onClick={() => window.location.href = `/dashboard/consultations?appointment_id=${apt.id}&patient_id=${apt.patient_id}`}
                          >
                            Consulter
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreHorizontal className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          <Card className="border-none shadow-sm bg-white overflow-x-auto">
            <CardContent className="p-0 min-w-[800px]">
              <div className="grid grid-cols-7 border-b bg-slate-50">
                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
                  <div key={day} className="py-2 text-center text-sm font-semibold text-slate-500 border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  const dayAppointments = appointments.filter(apt => isSameDay(new Date(apt.start_time), day));
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  
                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "min-h-[120px] p-2 border-r border-b last:border-r-0 group transition-colors",
                        !isCurrentMonth ? "bg-slate-50/50" : "bg-white hover:bg-slate-50/30",
                        isSameDay(day, new Date()) && "bg-blue-50/30"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          "text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full",
                          isSameDay(day, new Date()) ? "bg-primary text-white" : !isCurrentMonth ? "text-slate-300" : "text-slate-600"
                        )}>
                          {format(day, "d")}
                        </span>
                        {dayAppointments.length > 0 && (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            {dayAppointments.length}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayAppointments.slice(0, 3).map(apt => (
                          <div 
                            key={apt.id} 
                            className="text-[10px] p-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 truncate cursor-pointer hover:bg-indigo-100"
                            title={`${apt.patients?.first_name} ${apt.patients?.last_name} - ${format(new Date(apt.start_time), "HH:mm")}`}
                          >
                            <span className="font-bold">{format(new Date(apt.start_time), "HH:mm")}</span> {apt.patients?.last_name}
                          </div>
                        ))}
                        {dayAppointments.length > 3 && (
                          <div className="text-[10px] text-slate-400 pl-1">
                            + {dayAppointments.length - 3} de plus
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
