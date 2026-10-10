export interface AdobeStockCategoryItem {
  id: number;
  name: string;
  description: string;
}

/**
 * Official 21 Adobe Stock Categories Specification.
 * This serves as the frontend single source of truth, matching the backend enumeration.
 */
export const ADOBE_STOCK_CATEGORIES: AdobeStockCategoryItem[] = [
  { id: 1, name: 'Animals', description: 'Animals, wildlife, pets, insects, zoology' },
  { id: 2, name: 'Buildings and Architecture', description: 'Architecture, structures, urban skylines, interiors, exteriors' },
  { id: 3, name: 'Business', description: 'Business, corporate offices, finance, economics, corporate teamwork' },
  { id: 4, name: 'Drinks', description: 'Beverages, coffee, tea, wine, beer, cocktails, juices' },
  { id: 5, name: 'The Environment', description: 'Ecology, green energy, conservation, climate, recycling' },
  { id: 6, name: 'States of Mind', description: 'Emotions, feelings, mental health, meditation, psychological states' },
  { id: 7, name: 'Food', description: 'Culinary, meals, ingredients, cooking, dishes, produce' },
  { id: 8, name: 'Graphic Resources', description: 'Abstract textures, patterns, backgrounds, 3D renders, vector art' },
  { id: 9, name: 'Hobbies and Leisure', description: 'Recreational pastimes, crafts, gaming, music playing, outdoor leisure' },
  { id: 10, name: 'Industry', description: 'Heavy industry, factories, manufacturing, warehouses, construction, engineering' },
  { id: 11, name: 'Landscapes', description: 'Natural scenery, mountains, oceans, lakes, deserts, forests, wilderness' },
  { id: 12, name: 'Lifestyle', description: 'Everyday life, wellness, domestic routines, relationships, home living' },
  { id: 13, name: 'People', description: 'Portraits, human figures, faces, beauty portraits, people of all ages' },
  { id: 14, name: 'Plants and Flowers', description: 'Botany, flora, blossoms, trees, leaves, gardens' },
  { id: 15, name: 'Culture and Religion', description: 'Traditions, cultural celebrations, rituals, religious monuments' },
  { id: 16, name: 'Science', description: 'Scientific research, laboratories, medicine, healthcare, biology, chemistry' },
  { id: 17, name: 'Social Issues', description: 'Societal topics, protests, poverty, diversity, community advocacy' },
  { id: 18, name: 'Sports', description: 'Athletics, competitive sports, workouts, fitness, gym, marathons' },
  { id: 19, name: 'Technology', description: 'Computing, artificial intelligence, robotics, digital devices, modern gadgets' },
  { id: 20, name: 'Transport', description: 'Vehicles, automobiles, cars, trains, aviation, airplanes, boats, ships' },
  { id: 21, name: 'Travel', description: 'Tourism, vacation destinations, resorts, luggage, sightseeing' }
];

export function getCategoryById(id?: number): AdobeStockCategoryItem | undefined {
  if (id == null) return undefined;
  return ADOBE_STOCK_CATEGORIES.find((cat) => cat.id === id);
}

export function getCategoryLabel(id?: number, fallbackName?: string): string {
  const cat = getCategoryById(id);
  if (cat) return `${cat.id} - ${cat.name}`;
  if (id != null) return `${id} - ${fallbackName || 'Unknown'}`;
  return '—';
}
