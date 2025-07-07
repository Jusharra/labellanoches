import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
}

interface SuccessResponse<T = any> {
  success: true;
  data: T;
}

interface OrderStatusResponse {
  order_id: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  items_ordered: any[];
  total_price: number;
  channel: string;
  created_at: string;
  updated_at: string;
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
    const searchParams = url.searchParams

    console.log(`${req.method} ${url.pathname}`)

    let orderId: string | null = null;

    // GET /order-status-checker?order_id=xxx - Check order status via query parameter
    if (req.method === 'GET') {
      orderId = searchParams.get('order_id')
      
      if (!orderId) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'order_id query parameter is required'
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // POST /order-status-checker - Check order status via request body
    if (req.method === 'POST') {
      try {
        const requestData = await req.json()
        orderId = requestData.order_id

        if (!orderId) {
          const errorResponse: ErrorResponse = {
            success: false,
            error: 'order_id is required in request body'
          }
          
          return new Response(
            JSON.stringify(errorResponse),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError)
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Invalid JSON in request body',
          details: parseError.message
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Fetch order from database
    const { data: order, error } = await supabase
      .from('menu_orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error) {
      console.error('Database error fetching order:', error)
      
      // Check if it's a "not found" error
      if (error.code === 'PGRST116') {
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Order with ID ${orderId} not found`
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const errorResponse: ErrorResponse = {
        success: false,
        error: `Failed to fetch order status: ${error.message}`,
        details: error
      }
      
      return new Response(
        JSON.stringify(errorResponse),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Transform order data for response
    const orderStatusData: OrderStatusResponse = {
      order_id: order.id,
      status: order.status,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      items_ordered: order.items_ordered || [],
      total_price: parseFloat(order.total_price || '0'),
      channel: order.channel,
      created_at: order.created_at,
      updated_at: order.updated_at
    }

    const successResponse: SuccessResponse<OrderStatusResponse> = {
      success: true,
      data: orderStatusData
    }

    console.log(`Order status check successful for order ${orderId}: ${order.status}`)

    return new Response(
      JSON.stringify(successResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error in order status checker:', error)
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: error.message || 'An unexpected error occurred while checking order status',
      details: error.stack
    }
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})