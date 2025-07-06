import { createClient } from 'npm:@supabase/supabase-js@2'

// Env-vars
const SUPA_URL = Deno.env.get('SUPABASE_URL')!;
const SUPA_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Supabase client with service-role key
const supabase = createClient(SUPA_URL, SUPA_KEY);

Deno.serve(async () => {
  try {
    console.log('scheduleChecker: Checking for due campaigns at', new Date().toISOString());
    
    // 1) Find all campaigns whose time is due
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, title, scheduled_time')
      .eq('status', 'scheduled')
      .lte('scheduled_time', new Date().toISOString());

    if (error) {
      console.error('scheduleChecker read error:', error);
      return new Response('error', { status: 500 });
    }

    if (data && data.length > 0) {
      console.log(`scheduleChecker: Found ${data.length} campaigns due for sending:`, data);
      
      const ids = data.map(r => r.id);
      
      // 2) Flip them to "sending" (lowercase to match database schema)
      const { error: upErr } = await supabase
        .from('campaigns')
        .update({ status: 'sending' })
        .in('id', ids);

      if (upErr) {
        console.error('scheduleChecker update error:', upErr);
        return new Response('error', { status: 500 });
      }

      console.log(`scheduleChecker: Successfully updated ${ids.length} campaigns to sending status`);
      
      // Log which campaigns were processed
      data.forEach(campaign => {
        console.log(`- Campaign "${campaign.title}" (ID: ${campaign.id}) scheduled for ${campaign.scheduled_time}`);
      });
    } else {
      console.log('scheduleChecker: No campaigns due for sending at this time');
    }

    return new Response('ok', { 
      headers: { 'Content-Type': 'text/plain' },
      status: 200 
    });
    
  } catch (err) {
    console.error('scheduleChecker unexpected error:', err);
    return new Response('error', { status: 500 });
  }
});