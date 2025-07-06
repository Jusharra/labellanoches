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
      customer_phone: customerPhone || '+1234567890',
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

    // TODO: Implement actual SMS/WhatsApp sending here
    // Example with Twilio:
    // await sendSMS(customerPhone, confirmationMessage)
    
    console.log('Confirmation message ready:', confirmationMessage)

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