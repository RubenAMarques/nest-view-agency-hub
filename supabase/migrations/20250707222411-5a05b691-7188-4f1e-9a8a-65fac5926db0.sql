-- Remove the recursive policy that's causing infinite recursion
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;

-- Keep only the basic policy that allows users to view their own profile
-- This policy already exists, but let's ensure it's correct
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);