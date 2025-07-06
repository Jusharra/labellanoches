// Imports
import Airtable from 'npm:airtable';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Env-vars (set in your Edge Function dashboard)
const AIRTABLE_API_KEY  = Deno.env.get('AIRTABLE_API_KEY')!;
const AIRTABLE_BASE_ID  = Deno.env.get('AIRTABLE_BASE_ID')!;
const CAMPAIGNS_TABLE   = 'Campaigns';  // your Airtable table name

// Configure Airtable client
Airtable.configure({ apiKey: AIRTABLE_API_KEY });
const base = Airtable.base(AIRTABLE_BASE_ID);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Supabase Realtime POSTs a body like { new: { ...row columns... }, old: { ... } }
    const { new: row } = await req.json();

    const airtableId = row.airtable_record_id;
    if (!airtableId) {
      console.warn('No Airtable ID on Supabase row', row.id);
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    // Only two statuses matter here
    switch (row.status as string) {
      case 'Create Message Content':
        // tell Airtable to mark it so your existing Automation will run AI
        await base(CAMPAIGNS_TABLE).update([
          {
            id: airtableId,
            fields: {
              status: 'Create Message Content'
            }
          }
        ]);
        break;

      case 'Sending':
        // tell Airtable to mark it Sending → your SMS/WA Automation picks this up
        await base(CAMPAIGNS_TABLE).update([
          {
            id: airtableId,
            fields: {
              status: 'Sending'
            }
          }
        ]);
        break;

      default:
        // no op
        break;
    }

    return new Response('ok', { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('campaignNotify error:', err);
    return new Response('error', { status: 500, headers: corsHeaders });
  }
});