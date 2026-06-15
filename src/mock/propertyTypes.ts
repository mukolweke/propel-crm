import type { PropertyType } from '@/types'

export const DEFAULT_PROPERTY_TYPES: Omit<PropertyType, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Single Family Home', description: 'Detached or semi-detached residential homes', active: true, sortOrder: 1 },
  { name: 'Apartment', description: 'Multi-unit residential apartments', active: true, sortOrder: 2 },
  { name: 'Townhouse', description: 'Row or terrace-style homes', active: true, sortOrder: 3 },
  { name: 'Condominium', description: 'Individually owned units in a shared building', active: true, sortOrder: 4 },
  { name: 'Commercial', description: 'Office, retail, and commercial spaces', active: true, sortOrder: 5 },
  { name: 'Estate / Luxury', description: 'High-end estates and luxury properties', active: true, sortOrder: 6 },
  { name: 'Land', description: 'Vacant land and development plots', active: true, sortOrder: 7 },
]
