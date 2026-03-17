-- Incremental migration for Magasin Central expansion

-- Table for Stock Transfers (Central to Pharmacy)
CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    source_stock_id UUID REFERENCES public.central_stock(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    clinic_id UUID NOT NULL,
    requested_by UUID REFERENCES auth.users(id),
    completed_by UUID REFERENCES auth.users(id)
);

-- Table for Inventory Sessions (Physical Stocktakes)
CREATE TABLE IF NOT EXISTS public.inventories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_name TEXT NOT NULL,
    date_inventaire TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    clinic_id UUID NOT NULL
);

-- Table for Inventory Items (Individual stock counts)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID REFERENCES public.inventories(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE,
    batch_number TEXT,
    theoretical_quantity INTEGER DEFAULT 0,
    physical_quantity INTEGER NOT NULL,
    difference INTEGER GENERATED ALWAYS AS (physical_quantity - theoretical_quantity) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Simple policies (assuming clinic_id check)
CREATE POLICY "Users can see their clinic stock transfers" ON public.stock_transfers
FOR SELECT USING (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their clinic stock transfers" ON public.stock_transfers
FOR ALL USING (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can see their clinic inventories" ON public.inventories
FOR SELECT USING (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their clinic inventories" ON public.inventories
FOR ALL USING (clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can see their clinic inventory items" ON public.inventory_items
FOR SELECT USING (inventory_id IN (SELECT id FROM inventories WHERE clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can manage their clinic inventory items" ON public.inventory_items
FOR ALL USING (inventory_id IN (SELECT id FROM inventories WHERE clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())));
