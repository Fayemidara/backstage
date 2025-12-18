import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Check for Paystack Secret Key
        const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY')
        if (!paystackKey) {
            console.error("CRITICAL: Missing PAYSTACK_SECRET_KEY in Edge Function Secrets.")
            // Log available keys for debugging (security: do not log values)
            const envKeys = Object.keys(Deno.env.toObject())
            console.log("Available Environment Keys:", envKeys)

            throw new Error("Server configuration error: Paystack Secret Key is missing.")
        }

        // 2. Initialize Supabase Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // 3. Parse Request Body
        const { artist_id, community_id } = await req.json()
        console.log(`Initializing transaction for Artist: ${artist_id}, Community: ${community_id}`)

        // 4. Get User
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            console.error("Auth Error:", userError)
            throw new Error('User not authenticated')
        }

        // 5. Get Community Details (Price)
        const { data: community, error: commError } = await supabaseClient
            .from('communities')
            .select('subscription_price')
            .eq('id', community_id)
            .single()

        if (commError || !community) {
            console.error("Community Lookup Error:", commError)
            throw new Error('Community not found')
        }

        // 6. Calculate Amount (USD to Cents)
        // Paystack expects amount in kobo/cents
        // NOTE: Switching to NGN for test keys which likely don't support USD.
        const amountInCents = Math.round(community.subscription_price * 100)
        console.log(`Price: ${community.subscription_price} -> ${amountInCents} kobo (NGN)`)

        // 7. Call Paystack API
        const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${paystackKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: user.email,
                amount: amountInCents,
                currency: 'NGN', // Changed from USD to NGN to fix "Currency not supported" error
                callback_url: `${req.headers.get('origin')}/community/${community_id}?welcome=true`,
                metadata: {
                    user_id: user.id,
                    artist_id: artist_id,
                    community_id: community_id,
                },
            }),
        })

        const paystackData = await paystackRes.json()

        if (!paystackData.status) {
            console.error("Paystack API Error:", paystackData)
            throw new Error(paystackData.message || 'Paystack initialization failed')
        }

        console.log("Paystack Initialization Success:", paystackData.data.reference)

        // 8. Return Authorization URL
        return new Response(
            JSON.stringify({ authorization_url: paystackData.data.authorization_url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error("Edge Function Failed:", error)
        return new Response(
            JSON.stringify({ error: error.message, details: error.toString() }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
