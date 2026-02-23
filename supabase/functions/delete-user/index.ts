import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Initialize Supabase client with Service Role Key
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        )

        // 2. Authenticate the caller (User JWT)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing Authorization header')
        }

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))

        if (authError || !user) {
            throw new Error('Unauthorized')
        }

        const userId = user.id

        console.log(`Attempting to delete user: ${userId}`)

        // 3. Delete user's data from public tables (optional if ON DELETE CASCADE is set, but good practice)
        // Based on my schema check: sightings and profiles have foreign keys to auth.users.
        // If they don't have CASCADE, we should delete them here.
        // Sightings: sightings_user_id_fkey -> auth.users.id
        // Profiles: profiles_id_fkey -> auth.users.id

        // Deleting sightings first if any
        const { error: sightingsError } = await supabaseAdmin
            .from('sightings')
            .delete()
            .eq('user_id', userId)

        if (sightingsError) console.error('Error deleting sightings:', sightingsError)

        // Deleting profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', userId)

        if (profileError) console.error('Error deleting profile:', profileError)

        // 4. Delete the user from Auth
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (deleteError) {
            throw deleteError
        }

        return new Response(
            JSON.stringify({ message: 'User deleted successfully' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
