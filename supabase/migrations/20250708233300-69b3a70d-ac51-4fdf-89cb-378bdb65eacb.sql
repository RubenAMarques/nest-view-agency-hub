-- Add DELETE policies for imports table
CREATE POLICY "Users can delete imports from their agency" 
ON public.imports 
FOR DELETE 
USING (EXISTS (
  SELECT 1 
  FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.agency_id = imports.agency_id
));

CREATE POLICY "Admin can delete all imports" 
ON public.imports 
FOR DELETE 
USING (EXISTS (
  SELECT 1 
  FROM profiles p 
  JOIN agencies a ON p.agency_id = a.id 
  WHERE p.user_id = auth.uid() 
  AND a.name = 'Administrador'
));

-- Add UPDATE policy for imports to allow status updates
CREATE POLICY "Users can update imports from their agency" 
ON public.imports 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 
  FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.agency_id = imports.agency_id
));