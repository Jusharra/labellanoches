import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!supabaseServiceKey 
      })
      
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Server configuration error: Missing required environment variables'
      }
      
      return new Response(
        JSON.stringify(errorResponse),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const pathname = url.pathname
    const searchParams = url.searchParams

    console.log(`${req.method} ${pathname}`)

    // GET /menu-operations/items - Get menu items
    if (req.method === 'GET' && pathname.endsWith('/items')) {
      const activeOnly = searchParams.get('active') === 'true'
      const category = searchParams.get('category')

      let query = supabase.from('menu_items').select('*')

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      if (category && category !== 'all') {
        query = query.eq('category', category)
      }

      const { data: menuItems, error } = await query.order('category').order('name')

      if (error) {
        console.error('Database error fetching menu items:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to fetch menu items: ${error.message}`,
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

      const successResponse: SuccessResponse = {
        success: true,
        data: menuItems || []
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /menu-operations/stats - Get menu statistics
    if (req.method === 'GET' && pathname.endsWith('/stats')) {
      try {
        // Get total active menu items
        const { count: totalItems, error: itemsError } = await supabase
          .from('menu_items')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)

        if (itemsError) {
          console.error('Error counting menu items:', itemsError)
        }

        // Get today's orders
        const today = new Date().toISOString().split('T')[0]
        const { count: todayOrders, error: ordersError } = await supabase
          .from('menu_orders')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59`)

        if (ordersError) {
          console.error('Error counting today\'s orders:', ordersError)
        }

        // Get today's revenue
        const { data: revenueData, error: revenueError } = await supabase
          .from('menu_orders')
          .select('total_price')
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59`)
          .eq('status', 'completed')

        if (revenueError) {
          console.error('Error calculating revenue:', revenueError)
        }

        const todayRevenue = revenueData?.reduce((sum, order) => sum + parseFloat(order.total_price || '0'), 0) || 0

        // Get most popular item today
        const { data: orderItems, error: popularError } = await supabase
          .from('menu_orders')
          .select('items_ordered')
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59`)

        let popularItem = 'Signature Salmon' // Default fallback

        if (!popularError && orderItems) {
          const itemCounts: { [key: string]: number } = {}
          
          orderItems.forEach(order => {
            if (order.items_ordered && Array.isArray(order.items_ordered)) {
              order.items_ordered.forEach((item: any) => {
                if (item.name) {
                  itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.quantity || 1)
                }
              })
            }
          })

          const mostPopular = Object.entries(itemCounts).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0])
          if (mostPopular[1] > 0) {
            popularItem = mostPopular[0]
          }
        }

        const stats = {
          totalItems: totalItems || 0,
          todayOrders: todayOrders || 0,
          todayRevenue: todayRevenue,
          popularItem: popularItem
        }

        const successResponse: SuccessResponse = {
          success: true,
          data: stats
        }

        return new Response(
          JSON.stringify(successResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (statsError) {
        console.error('Error in stats calculation:', statsError)
        
        // Return default stats if there's an error
        const defaultStats = {
          totalItems: 0,
          todayOrders: 0,
          todayRevenue: 0,
          popularItem: 'No data available'
        }

        const successResponse: SuccessResponse = {
          success: true,
          data: defaultStats
        }

        return new Response(
          JSON.stringify(successResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // POST /menu-operations/items - Create new menu item
    if (req.method === 'POST' && pathname.endsWith('/items')) {
      let itemData
      
      try {
        const requestText = await req.text()
        if (!requestText || requestText.trim() === '') {
          throw new Error('Request body is empty')
        }
        itemData = JSON.parse(requestText)
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

      const { data: newItem, error } = await supabase
        .from('menu_items')
        .insert(itemData)
        .select()
        .single()

      if (error) {
        console.error('Database error creating menu item:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to create menu item: ${error.message}`,
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

      const successResponse: SuccessResponse = {
        success: true,
        data: newItem
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT /menu-operations/items/:id - Update menu item
    if (req.method === 'PUT' && pathname.includes('/items/')) {
      const itemId = pathname.split('/').pop()
      
      let updateData
      
      try {
        const requestText = await req.text()
        if (!requestText || requestText.trim() === '') {
          throw new Error('Request body is empty')
        }
        updateData = JSON.parse(requestText)
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

      const { data: updatedItem, error } = await supabase
        .from('menu_items')
        .update(updateData)
        .eq('id', itemId)
        .select()
        .single()

      if (error) {
        console.error('Database error updating menu item:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to update menu item: ${error.message}`,
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

      const successResponse: SuccessResponse = {
        success: true,
        data: updatedItem
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE /menu-operations/items/:id - Delete menu item
    if (req.method === 'DELETE' && pathname.includes('/items/')) {
      const itemId = pathname.split('/').pop()

      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId)

      if (error) {
        console.error('Database error deleting menu item:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to delete menu item: ${error.message}`,
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

      const successResponse: SuccessResponse = {
        success: true,
        data: { message: 'Menu item deleted successfully' }
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If no route matches
    const errorResponse: ErrorResponse = {
      success: false,
      error: `Endpoint not found: ${req.method} ${pathname}`
    }

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in menu operations:', error)
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: error.message || 'An unexpected error occurred',
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