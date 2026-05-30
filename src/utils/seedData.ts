import { db } from '@/lib/supabase'
import { toast } from 'sonner'
import { DEFAULT_CURRENCY } from '@/lib/utils'

export const sampleResources = [
  // Materials
  { category: 'materials', name: 'OPC 53 Grade Cement', description: '50 kg bag, branded cement for RCC and masonry work', unit: 'bag', unit_price: 420 },
  { category: 'materials', name: 'River Sand (Coarse)', description: 'Good quality river sand for concreting and masonry', unit: 'ton', unit_price: 2500 },
  { category: 'materials', name: 'TMT Steel Bars (Fe 500)', description: 'High strength deformed bars for reinforcement', unit: 'kg', unit_price: 68 },
  { category: 'materials', name: 'Red Bricks (Class A)', description: 'Standard kiln burnt clay bricks (per 1000 pcs = 8000)', unit: 'piece', unit_price: 8 },
  { category: 'materials', name: 'Crushed Stone Aggregate (20mm)', description: 'Blue metal for RCC work', unit: 'ton', unit_price: 1800 },
  { category: 'materials', name: 'Vitrified Tiles (600x600mm)', description: 'Premium grade floor tiles', unit: 'sq ft', unit_price: 55 },
  { category: 'materials', name: 'Emulsion Paint (Interior)', description: 'Premium acrylic emulsion paint', unit: 'liter', unit_price: 280 },

  // Labor
  { category: 'labor', name: 'Skilled Mason', description: 'Mason for brickwork, plastering, and finishing', unit: 'day', unit_price: 800 },
  { category: 'labor', name: 'Unskilled Helper / Mazdoor', description: 'General labor for carrying materials and mixing', unit: 'day', unit_price: 500 },
  { category: 'labor', name: 'Bar Bender / Steel Fixer', description: 'Skilled labor for cutting and tying reinforcement', unit: 'day', unit_price: 850 },
  { category: 'labor', name: 'Carpenter', description: 'Shuttering and formwork carpenter', unit: 'day', unit_price: 900 },
  { category: 'labor', name: 'Electrician', description: 'Skilled electrician for wiring and conduits', unit: 'day', unit_price: 800 },
  { category: 'labor', name: 'Plumber', description: 'Skilled plumber for piping and sanitation', unit: 'day', unit_price: 850 },
  { category: 'labor', name: 'Painter', description: 'Skilled painter for putty, primer and finish coats', unit: 'day', unit_price: 750 },

  // Equipment
  { category: 'equipment', name: 'Concrete Mixer Machine (10/7 CFT)', description: 'Site mixer rental without operator', unit: 'day', unit_price: 1200 },
  { category: 'equipment', name: 'JCB Backhoe Loader', description: 'Excavation and loading equipment', unit: 'hour', unit_price: 1000 },
  { category: 'equipment', name: 'Plate Compactor', description: 'Earth rammer/compactor for soil', unit: 'day', unit_price: 800 },
  { category: 'equipment', name: 'Tower Hoist (Winch)', description: 'Material lifting hoist for multi-story', unit: 'day', unit_price: 1500 },
  { category: 'equipment', name: 'Scaffolding (Steel H-Frames)', description: 'Steel tubular scaffolding set', unit: 'frame/day', unit_price: 15 },
  { category: 'equipment', name: 'Needle Vibrator', description: 'Concrete vibrator with electrical motor/petrol engine', unit: 'day', unit_price: 400 },
  { category: 'equipment', name: 'Water Tanker (5000 Liters)', description: 'Water supply for curing and construction', unit: 'trip', unit_price: 800 },
]

export const seedSampleData = async (userId: string, activeTab: string) => {
  try {
    const itemsToInsert = sampleResources
      .filter((item) => item.category === activeTab)
      .map((item) => ({
        ...item,
        user_id: userId,
        currency: DEFAULT_CURRENCY,
      }))

    if (itemsToInsert.length === 0) return false

    const { error } = await db.from('resources').insert(itemsToInsert)

    if (error) {
      console.error('Seeding error:', error)
      toast.error('Failed to insert sample data: ' + error.message)
      return false
    }

    toast.success(`Successfully added ${itemsToInsert.length} sample items to ${activeTab}!`)
    return true
  } catch (err) {
    console.error(err)
    toast.error('An unexpected error occurred while seeding.')
    return false
  }
}
