import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const pathname = url.pathname
    const searchParams = url.searchParams

    // GET /order-operations/pending - Get pending orders
    if (req.method === 'GET' && pathname.endsWith('/pending')) {
      const limit = parseInt(searchParams.get('limit') || '50')

      const { data: orders, error } = await supabase
        .from('menu_orders')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(`Failed to fetch pending orders: ${error.message}`)
      }

      // Transform orders to match the expected format
      const transformedOrders = orders?.map(order => ({
        id: order.id,
        customerName: order.customer_name,
        items: Array.isArray(order.items_ordered) 
          ? order.items_ordered.map((item: any) => item.name).join(', ')
          : 'Unknown items',
        total: `$${parseFloat(order.total_price || '0').toFixed(2)}`,
        channel: order.channel === 'WhatsApp' ? 'WhatsApp' : 'SMS',
        time: new Date(order.created_at).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        status: 'Pending',
        phone: order.customer_phone
      })) || []

      return new Response(
        JSON.stringify({ success: true, data: transformedOrders }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /order-operations/:id/complete - Mark order as complete
    if (req.method === 'POST' && pathname.includes('/complete')) {
      const orderId = pathname.split('/')[2] // Extract ID from /order-operations/:id/complete

      const { data: updatedOrder, error } = await supabase
        .from('menu_orders')
        .update({ status: 'completed' })
        .eq('id', orderId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to complete order: ${error.message}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: updatedOrder,
          message: 'Order marked as completed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /order-operations/:id/cancel - Cancel order
    if (req.method === 'POST' && pathname.includes('/cancel')) {
      const orderId = pathname.split('/')[2] // Extract ID from /order-operations/:id/cancel

      const { data: updatedOrder, error } = await supabase
        .from('menu_orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to cancel order: ${error.message}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: updatedOrder,
          message: 'Order cancelled'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /order-operations/today - Get today's orders count
    if (req.method === 'GET' && pathname.endsWith('/today')) {
      const today = new Date().toISOString().split('T')[0]

      const { count, error } = await supabase
        .from('menu_orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)

      if (error) {
        throw new Error(`Failed to count today's orders: ${error.message}`)
      }

      return new Response(
        JSON.stringify({ success: true, data: { count: count || 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Endpoint not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in order operations:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})