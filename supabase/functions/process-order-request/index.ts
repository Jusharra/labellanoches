import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface OrderItem {
  item_id: string;
  quantity: number;
  name: string;
  price: number;
}

interface ProcessOrderRequest {
  customerResponse: string;
  customerPhone?: string;
  customerName?: string;
  channel?: 'SMS' | 'WhatsApp';
}

interface MakeWebhookPayload {
  order_id: string;
  customer_name: string;
  customer_phone: string;
  items_ordered: OrderItem[];
  total_price: number;
  channel: string;
  status: string;
  created_at: string;
  confirmation_message: string;
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

    // Parse request body
    const { customerResponse, customerPhone, customerName, channel }: ProcessOrderRequest = await req.json()

    if (!customerResponse || !customerResponse.trim()) {
      throw new Error('Customer response is required')
    }

    // Step 1: Validate item numbers
    // Extract numbers from customer response (e.g., "1,3" or "2")
    const itemNumbers = customerResponse.match(/\d+/g)
    
    if (!itemNumbers || itemNumbers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No valid item numbers found in response. Please specify item numbers like "1,3" or "2".' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Convert to integers and remove duplicates
    const uniqueItemNumbers = [...new Set(itemNumbers.map(num => parseInt(num)))]

    // Fetch menu items from database to validate
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_active', true)
      .order('id')

    if (menuError) {
      throw new Error(`Failed to fetch menu items: ${menuError.message}`)
    }

    if (!menuItems || menuItems.length === 0) {
      throw new Error('No menu items found')
    }

    // Validate that all requested item numbers exist
    const validItems: OrderItem[] = []
    for (const itemNumber of uniqueItemNumbers) {
      // Item numbers are 1-indexed, so subtract 1 for array access
      const menuItem = menuItems[itemNumber - 1]
      
      if (!menuItem) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Item number ${itemNumber} is not valid. Please choose from items 1-${menuItems.length}.` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      validItems.push({
        item_id: menuItem.id,
        quantity: 1, // Default quantity of 1 for each item
        name: menuItem.name,
        price: parseFloat(menuItem.price)
      })
    }

    // Step 2: Calculate total price
    const totalPrice = validItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    // Step 3: Create order record
    const orderData = {
      customer_name: customerName || 'Unknown Customer',
      customer_phone: customerPhone || Deno.env.get('BUSINESS_PHONE_NUMBER') || '+18445437419',
      items_ordered: validItems,
      total_price: totalPrice,
      channel: channel || 'SMS',
      status: 'pending'
    }

    const { data: newOrder, error: orderError } = await supabase
      .from('menu_orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError) {
      throw new Error(`Failed to create order: ${orderError.message}`)
    }

    // Step 4: Send confirmation message
    // In a real implementation, you would integrate with Twilio, Vonage, or another messaging service
    // For now, we'll prepare the confirmation message content
    const itemList = validItems.map(item => `- ${item.name} ($${item.price.toFixed(2)})`).join('\n')
    const confirmationMessage = `Order confirmed! 🍽️

Order #${newOrder.id.slice(0, 8)}
${itemList}

Total: $${totalPrice.toFixed(2)}

Your order will be ready in 15-20 minutes. 
Reply with any special instructions.

Thank you for choosing La Bella Noches!`

    console.log('Order created successfully:', newOrder.id)

    // Step 5: Trigger Make.com webhook
    if (makeWebhookUrl) {
      try {
        console.log('Sending order data to Make.com webhook...')
        
        const webhookPayload: MakeWebhookPayload = {
          order_id: newOrder.id,
          customer_name: newOrder.customer_name,
          customer_phone: newOrder.customer_phone,
          items_ordered: validItems,
          total_price: totalPrice,
          channel: newOrder.channel,
          status: newOrder.status,
          created_at: newOrder.created_at,
          confirmation_message: confirmationMessage
        }

        const webhookResponse = await fetch(makeWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload)
        })

        if (webhookResponse.ok) {
          console.log('Successfully sent order to Make.com webhook')
        } else {
          console.error('Make.com webhook returned non-200 status:', webhookResponse.status, await webhookResponse.text())
        }
      } catch (webhookError) {
        // Log the error but don't fail the entire order process
        console.error('Failed to send data to Make.com webhook:', webhookError.message)
        console.error('Order was still created successfully in database')
      }
    } else {
      console.log('Make.com webhook URL not configured - skipping webhook call')
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: newOrder,
        message: `Successfully processed order for items: ${uniqueItemNumbers.join(', ')}`,
        details: {
          items: validItems,
          total: totalPrice,
          confirmationMessage
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error processing order:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred while processing the order' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})