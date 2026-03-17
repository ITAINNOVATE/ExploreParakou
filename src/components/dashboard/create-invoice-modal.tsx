"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";
import { BillingForm } from "./billing-form";

export function CreateInvoiceModal({ 
  patientId, 
  onCreated,
  variant = "button"
}: { 
  patientId?: string;
  onCreated: () => void;
  variant?: "button" | "dropdown";
}) {
  const [open, setOpen] = useState(false);

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
        variant === "button" ? (
          <Button className="gap-2 shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white">
            <Receipt className="h-4 w-4" />
            Facturer Patient
          </Button>
        ) : (
          <div className="flex gap-2 items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-100 rounded-sm">
            <Receipt className="h-4 w-4 text-emerald-600" />
            Facturer le patient
          </div>
        )
      } />
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <div className="p-6 border-b shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Receipt className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <DialogTitle>Générer une Facture</DialogTitle>
              <DialogDescription>
                Ajoutez les prestations médicales au panier pour générer la facture.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <BillingForm 
            patientId={patientId} 
            onSuccess={() => {
              setOpen(false);
              onCreated();
            }} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
