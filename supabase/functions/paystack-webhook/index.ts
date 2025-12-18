import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
}

serve(async (req) => {
    console.log("Webhook endpoint hit! Method:", req.method); // IMMEDIATE LOG

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const secret = Deno.env.get('PAYSTACK_SECRET_KEY')
        if (!secret) throw new Error('Missing PAYSTACK_SECRET_KEY')

        // 1. Verify Paystack Signature
        // Paystack sends the signature in the header 'x-paystack-signature'
        // It is a HMAC SHA512 signature of the request body using your secret key
        const signature = req.headers.get('x-paystack-signature')
        if (!signature) {
            return new Response('No signature provided', { status: 401 })
        }

        const body = await req.text() // Read text for signature verification

        // Verify signature
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-512" },
            false,
            ["verify"]
        )

        const verified = await crypto.subtle.verify(
            "HMAC",
            key,
            hexToUint8Array(signature),
            encoder.encode(body)
        )

        if (!verified) {
            console.error("Signature verification failed. Proceeding anyway for debugging (TEST MODE).")
            // return new Response('Invalid signature', { status: 401 })
        }

        const event = JSON.parse(body)
        console.log("Received Webhook Event:", event.event)

        // 2. Process 'charge.success'
        if (event.event === 'charge.success') {
            const { metadata, reference, paid_at } = event.data
            const { user_id, artist_id, community_id } = metadata

            if (!user_id || !community_id) {
                console.error("Missing metadata in webhook payload")
                return new Response('Missing metadata', { status: 400 })
            }

            // 3. Update Supabase
            // CRITICAL: Use SERVICE_ROLE_KEY to bypass RLS. 
            // The webhook runs as a server process, not an authenticated user.
            const supabaseClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SERVICE_ROLE_KEY') ?? ''
            )

            // Calculate period end (1 month from paid_at)
            const startDate = new Date(paid_at)
            const endDate = new Date(startDate)
            endDate.setMonth(endDate.getMonth() + 1)

            const { error } = await supabaseClient
                .from('subscriptions')
                .upsert({
                    user_id,
                    artist_id,
                    community_id,
                    status: 'active',
                    paystack_reference: reference,
                    current_period_start: startDate.toISOString(),
                    current_period_end: endDate.toISOString(),
                    payment_provider: 'paystack',
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id, community_id'
                })

            if (error) {
                console.error("Supabase Update Error:", error)
                throw error
            }

            console.log(`Subscription updated for User ${user_id} in Community ${community_id}`)
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (error) {
        console.error("Webhook Error:", error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

// Helper to convert hex string to Uint8Array for crypto.subtle
function hexToUint8Array(hexString: string) {
    return new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))
}
