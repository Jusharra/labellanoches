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

interface AbandonedOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  items_ordered: any[];
  total_price: number;
  channel: string;
  created_at: string;
}

interface RecoveryWebhookPayload {
  action: string;
  order_id: string;
  customer_name: string;
  customer_phone: string;
  items_ordered: any[];
  total_price: number;
  channel: string;
  created_at: string;
  recovery_message: string;
  minutes_abandoned: number;
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

    // Get Make.com webhook URL from environment variables
    const makeWebhookUrl = Deno.env.get('MAKE_ORDER_WEBHOOK_URL')
    if (!makeWebhookUrl) {
      console.warn('MAKE_ORDER_WEBHOOK_URL environment variable not set - recovery messages cannot be sent')
      
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Webhook URL not configured for sending recovery messages'
      }
      
      return new Response(
        JSON.stringify(errorResponse),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('abandoned-order-recovery: Starting recovery check at', new Date().toISOString())

    // Calculate the cutoff time (30 minutes ago)
    const cutoffTime = new Date()
    cutoffTime.setMinutes(cutoffTime.getMinutes() - 30)
    const cutoffISOString = cutoffTime.toISOString()

    console.log('abandoned-order-recovery: Looking for orders older than', cutoffISOString)

    // Step 1: Find abandoned orders (pending orders older than 30 minutes)
    const { data: abandonedOrders, error: fetchError } = await supabase
      .from('menu_orders')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', cutoffISOString)
      .order('created_at', { ascending: true })
      .limit(50) // Process max 50 orders per run to avoid timeouts

    if (fetchError) {
      console.error('abandoned-order-recovery: Database error fetching abandoned orders:', fetchError)
      const errorResponse: ErrorResponse = {
        success: false,
        error: `Failed to fetch abandoned orders: ${fetchError.message}`,
        details: fetchError
      }
      
      return new Response(
        JSON.stringify(errorResponse),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!abandonedOrders || abandonedOrders.length === 0) {
      console.log('abandoned-order-recovery: No abandoned orders found')
      
      const successResponse: SuccessResponse = {
        success: true,
        data: { 
          message: 'No abandoned orders found',
          processed: 0,
          cutoff_time: cutoffISOString
        }
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`abandoned-order-recovery: Found ${abandonedOrders.length} abandoned orders`)

    // Step 2: Process each abandoned order
    const processedOrders: string[] = []
    const failedOrders: string[] = []

    for (const order of abandonedOrders) {
      try {
        // Calculate how long the order has been abandoned
        const orderTime = new Date(order.created_at)
        const minutesAbandoned = Math.floor((Date.now() - orderTime.getTime()) / (1000 * 60))

        // Generate personalized recovery message
        const recoveryMessage = generateRecoveryMessage(order, minutesAbandoned)

        console.log(`abandoned-order-recovery: Processing order ${order.id} (${minutesAbandoned} minutes old)`)

        // Step 3: Send recovery message via Make.com webhook
        const webhookPayload: RecoveryWebhookPayload = {
          action: 'abandoned_order_recovery',
          order_id: order.id,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          items_ordered: order.items_ordered || [],
          total_price: parseFloat(order.total_price || '0'),
          channel: order.channel,
          created_at: order.created_at,
          recovery_message: recoveryMessage,
          minutes_abandoned: minutesAbandoned
        }

        const webhookResponse = await fetch(makeWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload)
        })

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text()
          console.error(`abandoned-order-recovery: Webhook failed for order ${order.id}:`, webhookResponse.status, errorText)
          failedOrders.push(order.id)
          continue
        }

        console.log(`abandoned-order-recovery: Successfully sent recovery message for order ${order.id}`)

        // Step 4: Update order status to 'recovery_sent' to prevent re-processing
        const { error: updateError } = await supabase
          .from('menu_orders')
          .update({ status: 'recovery_sent' })
          .eq('id', order.id)

        if (updateError) {
          console.error(`abandoned-order-recovery: Failed to update order ${order.id} status:`, updateError)
          failedOrders.push(order.id)
        } else {
          processedOrders.push(order.id)
          console.log(`abandoned-order-recovery: Updated order ${order.id} status to 'recovery_sent'`)
        }

      } catch (orderError) {
        console.error(`abandoned-order-recovery: Error processing order ${order.id}:`, orderError)
        failedOrders.push(order.id)
      }
    }

    console.log(`abandoned-order-recovery: Completed. Processed: ${processedOrders.length}, Failed: ${failedOrders.length}`)

    const successResponse: SuccessResponse = {
      success: true,
      data: {
        message: `Processed ${processedOrders.length} abandoned orders`,
        total_found: abandonedOrders.length,
        processed_orders: processedOrders,
        failed_orders: failedOrders,
        cutoff_time: cutoffISOString,
        processing_time: new Date().toISOString()
      }
    }

    return new Response(
      JSON.stringify(successResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('abandoned-order-recovery: Unexpected error:', error)
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: error.message || 'An unexpected error occurred during abandoned order recovery',
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

/**
 * Generate a personalized recovery message for an abandoned order
 */
function generateRecoveryMessage(order: AbandonedOrder, minutesAbandoned: number): string {
  const customerName = order.customer_name || 'Valued Customer'
  const orderShortId = order.id.slice(0, 8).toUpperCase()
  
  // Format items list
  let itemsList = ''
  if (order.items_ordered && Array.isArray(order.items_ordered) && order.items_ordered.length > 0) {
    if (order.items_ordered.length === 1) {
      itemsList = order.items_ordered[0].name
    } else if (order.items_ordered.length === 2) {
      itemsList = `${order.items_ordered[0].name} and ${order.items_ordered[1].name}`
    } else {
      const firstItems = order.items_ordered.slice(0, -1).map(item => item.name).join(', ')
      const lastItem = order.items_ordered[order.items_ordered.length - 1].name
      itemsList = `${firstItems}, and ${lastItem}`
    }
  } else {
    itemsList = 'your selected items'
  }

  const totalPrice = parseFloat(order.total_price || '0')

  // Choose message tone based on how long it's been abandoned
  let messageVariant: string

  if (minutesAbandoned <= 60) {
    // Within 1 hour - gentle reminder
    messageVariant = `Hi ${customerName}! 👋

We noticed you started an order for ${itemsList} but didn't complete it. Your delicious meal is just one step away!

Order #${orderShortId}
Total: $${totalPrice.toFixed(2)}

Complete your order now and we'll have it ready in 15-20 minutes. Just reply "YES" or call us at (555) 123-4567.

La Bella Noches - Where every bite is worth the wait! 🍽️`

  } else if (minutesAbandoned <= 180) {
    // 1-3 hours - add small incentive
    messageVariant = `${customerName}, don't let your craving go unsatisfied! 😋

Your order for ${itemsList} is still waiting for you. To make it even better, we'll include a complimentary dessert with your order!

Order #${orderShortId}
Total: $${totalPrice.toFixed(2)} + FREE dessert! 🍰

Reply "COMPLETE" to finish your order or call (844) 543-7419. Offer valid for the next 2 hours.

La Bella Noches - Authentic flavors you deserve! ✨`

  } else {
    // 3+ hours - stronger incentive
    messageVariant = `${customerName}, we miss you already! 💔

Your order for ${itemsList} is still available, and we want to make it special. Complete your order now and get 15% OFF plus a free appetizer!

Order #${orderShortId}
Original Total: $${totalPrice.toFixed(2)}
Your Price: $${(totalPrice * 0.85).toFixed(2)} + FREE appetizer! 🎉

This exclusive offer expires in 4 hours. Reply "FINISH" or call (844) 543-7419 to claim it.

La Bella Noches - Come back, we're cooking something amazing! 👨‍🍳`
  }

  return messageVariant
}