-- Create rooms table
CREATE TABLE public.rooms (
  id TEXT PRIMARY KEY,
  thumbnail TEXT,
  is_live BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sources table
CREATE TABLE public.sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT REFERENCES public.rooms(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

-- Public policies (for LAN/Guest usage)
CREATE POLICY "Public read access" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.rooms FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.rooms FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.sources FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.sources FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.sources FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.sources FOR DELETE USING (true);