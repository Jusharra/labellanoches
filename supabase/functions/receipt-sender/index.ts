import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

interface ReceiptRequest {
  order_id: string;
  recipient_phone?: string;
  channel?: 'SMS' | 'WhatsApp';
  send_receipt?: boolean; // Whether to actually send or just generate
}

interface ReceiptData {
  order_id: string;
  customer_name: string;
  customer_phone: string;
  items_ordered: any[];
  total_price: number;
  channel: string;
  created_at: string;
  receipt_message: string;
  formatted_date: string;
  order_short_id: string;
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
      console.warn('MAKE_ORDER_WEBHOOK_URL environment variable not set - webhook will be skipped')
    }

    console.log(`${req.method} ${req.url}`)

    // Parse request body
    let requestData: ReceiptRequest
    try {
      const requestText = await req.text()
      if (!requestText || requestText.trim() === '') {
        throw new Error('Request body is empty')
      }
      requestData = JSON.parse(requestText)
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

    const { order_id, recipient_phone, channel = 'SMS', send_receipt = false } = requestData

    if (!order_id) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'order_id is required'
      }
      
      return new Response(
        JSON.stringify(errorResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Step 1: Fetch order details from database
    const { data: order, error: orderError } = await supabase
      .from('menu_orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (orderError) {
      console.error('Database error fetching order:', orderError)
      
      // Check if it's a "not found" error
      if (orderError.code === 'PGRST116') {
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Order with ID ${order_id} not found`
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
        error: `Failed to fetch order: ${orderError.message}`,
        details: orderError
      }
      
      return new Response(
        JSON.stringify(errorResponse),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Step 2: Format order date and create short ID
    const orderDate = new Date(order.created_at)
    const formattedDate = orderDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const formattedTime = orderDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
    const orderShortId = order.id.slice(0, 8).toUpperCase()

    // Step 3: Format items list for receipt
    let itemsList = ''
    let itemsTotal = 0

    if (order.items_ordered && Array.isArray(order.items_ordered)) {
      itemsList = order.items_ordered.map((item: any, index: number) => {
        const quantity = item.quantity || 1
        const price = parseFloat(item.price || 0)
        const itemTotal = quantity * price
        itemsTotal += itemTotal
        
        return `${index + 1}. ${item.name} (${quantity}x) - $${itemTotal.toFixed(2)}`
      }).join('\n')
    } else {
      itemsList = 'Order details not available'
    }

    // Step 4: Construct receipt message
    const totalPrice = parseFloat(order.total_price || '0')
    const taxAmount = totalPrice - itemsTotal
    
    const receiptMessage = `🧾 DIGITAL RECEIPT - La Bella Noches

Order #${orderShortId}
Date: ${formattedDate}
Time: ${formattedTime}

👤 Customer: ${order.customer_name}
📱 Phone: ${order.customer_phone}
📡 Channel: ${order.channel}

🍽️ ITEMS ORDERED:
${itemsList}

💰 ORDER SUMMARY:
Subtotal: $${itemsTotal.toFixed(2)}${taxAmount > 0 ? `\nTax & Fees: $${taxAmount.toFixed(2)}` : ''}
TOTAL: $${totalPrice.toFixed(2)}

📋 Status: ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}

Thank you for dining with La Bella Noches! 
Your satisfaction is our priority.

Questions? Reply to this message or call us at (844) 543-7419

---
La Bella Noches
123 Gourmet Street
Authentic Flavors, Local Ingredients`

    console.log('Generated receipt for order:', order_id)
    console.log('Receipt message length:', receiptMessage.length, 'characters')

    // Step 5: Prepare receipt data
    const receiptData: ReceiptData = {
      order_id: order.id,
      customer_name: order.customer_name,
      customer_phone: recipient_phone || order.customer_phone,
      items_ordered: order.items_ordered || [],
      total_price: totalPrice,
      channel: channel,
      created_at: order.created_at,
      receipt_message: receiptMessage,
      formatted_date: `${formattedDate} at ${formattedTime}`,
      order_short_id: orderShortId
    }

    // Step 6: Send receipt via Make.com webhook if requested
    if (send_receipt && makeWebhookUrl) {
      try {
        console.log('Sending receipt via Make.com webhook...')
        
        const webhookPayload = {
          action: 'send_receipt',
          order_id: order.id,
          customer_name: order.customer_name,
          customer_phone: receiptData.customer_phone,
          channel: channel,
          receipt_message: receiptMessage,
          created_at: order.created_at
        }

        const webhookResponse = await fetch(makeWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload)
        })

        if (webhookResponse.ok) {
          console.log('Successfully sent receipt to Make.com webhook')
        } else {
          console.error('Make.com webhook returned non-200 status:', webhookResponse.status, await webhookResponse.text())
          // Don't fail the entire request, just log the error
        }
      } catch (webhookError) {
        console.error('Failed to send receipt via Make.com webhook:', webhookError.message)
        // Continue with the response even if webhook fails
      }
    } else if (send_receipt) {
      console.log('Receipt sending requested but Make.com webhook URL not configured')
    } else {
      console.log('Receipt generated but not sent (send_receipt=false)')
    }

    // Step 7: Return response with receipt data
    const successResponse: SuccessResponse<ReceiptData> = {
      success: true,
      data: receiptData
    }

    return new Response(
      JSON.stringify(successResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error in receipt sender:', error)
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: error.message || 'An unexpected error occurred while generating receipt',
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