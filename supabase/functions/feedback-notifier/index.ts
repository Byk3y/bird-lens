import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

/**
 * FEEDBACK NOTIFIER
 * 
 * This function is designed to be triggered by a Supabase Database Webhook
 * whenever a new row is inserted into `public.user_feedback`.
 * 
 * It currently acts as a placeholder for future notification integrations 
 * (e.g. Email, Slack, or Discord). No active logging or notifications 
 * are performed until configured.
 */

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json()
        const { record } = payload // standard Supabase webhook payload

        if (!record) {
            throw new Error("No record found in payload")
        }

        const {
            scientific_name,
            feedback_type,
            // section_context,
            // user_message,
            // created_at,
            // user_id
        } = record

        // Console logs removed as per user request (notifications to be implemented later)

        // TODO: Integrate with an email service like Resend or SendGrid
        // Example (pseudo-code):
        // await resend.emails.send({
        //   from: 'BirdSnap <notifications@birdsnap.app>',
        //   to: 'admin@example.com',
        //   subject: `New Feedback: ${feedback_type} on ${scientific_name}`,
        //   html: `<strong>Context:</strong> ${section_context}<br/><strong>Message:</strong> ${user_message}`
        // })

        return new Response(
            JSON.stringify({
                message: "Notification processed",
                type: feedback_type,
                bird: scientific_name
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        )
    } catch (error: any) {
        console.error(`Error processing feedback notification: ${error.message}`)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        )
    }
})
