import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
}

interface SuggestionRequest {
  count?: number;
  category?: string;
  exclude_ids?: string[];
  price_range?: 'low' | 'medium' | 'high' | 'all';
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

    // GET /item-suggester/suggest - Get menu item suggestions
    if (req.method === 'GET' && url.pathname.endsWith('/suggest')) {
      // Parse query parameters
      const count = parseInt(searchParams.get('count') || '3')
      const category = searchParams.get('category')
      const excludeIdsParam = searchParams.get('exclude_ids')
      const priceRange = searchParams.get('price_range') as 'low' | 'medium' | 'high' | 'all' || 'all'

      // Parse exclude_ids if provided (comma-separated string)
      let excludeIds: string[] = []
      if (excludeIdsParam) {
        excludeIds = excludeIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      }

      // Validate count parameter
      if (count < 1 || count > 20) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Count must be between 1 and 20'
        }
        
        return new Response(
          JSON.stringify(errorResponse),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Build query for active menu items
      let query = supabase
        .from('menu_items')
        .select('id, name, description, price, category, image_url')
        .eq('is_active', true)

      // Filter by category if specified
      if (category && category !== 'all') {
        query = query.eq('category', category)
      }

      // Exclude specific items if provided
      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`)
      }

      const { data: menuItems, error } = await query

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

      if (!menuItems || menuItems.length === 0) {
        const successResponse: SuccessResponse<MenuItem[]> = {
          success: true,
          data: []
        }

        return new Response(
          JSON.stringify(successResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Filter by price range if specified
      let filteredItems = menuItems
      if (priceRange !== 'all') {
        filteredItems = menuItems.filter(item => {
          const price = parseFloat(item.price.toString())
          switch (priceRange) {
            case 'low':
              return price <= 15
            case 'medium':
              return price > 15 && price <= 30
            case 'high':
              return price > 30
            default:
              return true
          }
        })
      }

      // Implement intelligent suggestion logic
      let suggestedItems: MenuItem[] = []

      if (filteredItems.length <= count) {
        // If we have fewer items than requested, return all
        suggestedItems = filteredItems
      } else {
        // Smart selection algorithm
        suggestedItems = selectIntelligentSuggestions(filteredItems, count, category)
      }

      // Transform to ensure consistent structure
      const transformedSuggestions = suggestedItems.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: parseFloat(item.price.toString()),
        category: item.category,
        image_url: item.image_url
      }))

      console.log(`Generated ${transformedSuggestions.length} suggestions${category ? ` for category: ${category}` : ''}`)

      const successResponse: SuccessResponse<MenuItem[]> = {
        success: true,
        data: transformedSuggestions
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /item-suggester/categories - Get available categories
    if (req.method === 'GET' && url.pathname.endsWith('/categories')) {
      const { data: categories, error } = await supabase
        .from('menu_items')
        .select('category')
        .eq('is_active', true)
        .not('category', 'is', null)

      if (error) {
        console.error('Database error fetching categories:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to fetch categories: ${error.message}`,
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

      // Get unique categories
      const uniqueCategories = [...new Set(categories?.map(item => item.category).filter(Boolean))]

      const successResponse: SuccessResponse<string[]> = {
        success: true,
        data: uniqueCategories
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /item-suggester/popular - Get popular items (mock for now)
    if (req.method === 'GET' && url.pathname.endsWith('/popular')) {
      const count = parseInt(searchParams.get('count') || '5')

      // For now, we'll simulate popularity by selecting items with good price points
      // In a real implementation, you'd track order frequency
      const { data: menuItems, error } = await supabase
        .from('menu_items')
        .select('id, name, description, price, category, image_url')
        .eq('is_active', true)
        .order('price', { ascending: false }) // Simulate popularity with price as proxy
        .limit(count * 2) // Get more items to have variety

      if (error) {
        console.error('Database error fetching popular items:', error)
        const errorResponse: ErrorResponse = {
          success: false,
          error: `Failed to fetch popular items: ${error.message}`,
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

      // Randomly select from the higher-priced items to simulate popularity
      const popularItems = shuffleArray(menuItems || []).slice(0, count)

      const transformedItems = popularItems.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: parseFloat(item.price.toString()),
        category: item.category,
        image_url: item.image_url
      }))

      const successResponse: SuccessResponse<MenuItem[]> = {
        success: true,
        data: transformedItems
      }

      return new Response(
        JSON.stringify(successResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If no route matches
    const errorResponse: ErrorResponse = {
      success: false,
      error: `Endpoint not found: ${req.method} ${url.pathname}`
    }

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in item suggester:', error)
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: error.message || 'An unexpected error occurred while generating suggestions',
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
 * Intelligent suggestion algorithm that considers variety and balance
 */
function selectIntelligentSuggestions(items: MenuItem[], count: number, category?: string): MenuItem[] {
  if (items.length <= count) {
    return items
  }

  // If no specific category, ensure variety across categories
  if (!category || category === 'all') {
    return selectVariedSuggestions(items, count)
  } else {
    // For specific category, use weighted random selection
    return selectWeightedRandomItems(items, count)
  }
}

/**
 * Select items ensuring variety across categories
 */
function selectVariedSuggestions(items: MenuItem[], count: number): MenuItem[] {
  const categorized: { [key: string]: MenuItem[] } = {}
  
  // Group items by category
  items.forEach(item => {
    if (!categorized[item.category]) {
      categorized[item.category] = []
    }
    categorized[item.category].push(item)
  })

  const categories = Object.keys(categorized)
  const itemsPerCategory = Math.floor(count / categories.length)
  const remainder = count % categories.length

  let selected: MenuItem[] = []

  // Select items from each category
  categories.forEach((cat, index) => {
    const categoryItems = shuffleArray(categorized[cat])
    const takeCount = itemsPerCategory + (index < remainder ? 1 : 0)
    selected.push(...categoryItems.slice(0, Math.min(takeCount, categoryItems.length)))
  })

  // If we still need more items, randomly select from remaining
  if (selected.length < count) {
    const remaining = items.filter(item => !selected.find(s => s.id === item.id))
    const shuffledRemaining = shuffleArray(remaining)
    selected.push(...shuffledRemaining.slice(0, count - selected.length))
  }

  return shuffleArray(selected).slice(0, count)
}

/**
 * Select items using weighted random selection (higher-priced items have slightly higher weight)
 */
function selectWeightedRandomItems(items: MenuItem[], count: number): MenuItem[] {
  const itemsWithWeights = items.map(item => ({
    ...item,
    weight: Math.max(1, parseFloat(item.price.toString()) / 10) // Simple weight based on price
  }))

  const selected: MenuItem[] = []
  let availableItems = [...itemsWithWeights]

  for (let i = 0; i < count && availableItems.length > 0; i++) {
    const totalWeight = availableItems.reduce((sum, item) => sum + item.weight, 0)
    let random = Math.random() * totalWeight
    
    let selectedIndex = 0
    for (let j = 0; j < availableItems.length; j++) {
      random -= availableItems[j].weight
      if (random <= 0) {
        selectedIndex = j
        break
      }
    }

    selected.push(availableItems[selectedIndex])
    availableItems.splice(selectedIndex, 1)
  }

  return selected
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}