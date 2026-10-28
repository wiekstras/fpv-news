import type { CollectionConfig } from 'payload'
import { adminsOnly } from '../access'

// Geocoding results (OpenStreetMap Nominatim), kept forever so each place is looked up once.
export const GeoCache: CollectionConfig = {
  slug: 'geo-cache',
  admin: { hidden: true },
  access: adminsOnly,
  fields: [
    { name: 'key', type: 'text', required: true, unique: true },
    { name: 'lat', type: 'number' },
    { name: 'lon', type: 'number' },
  ],
}
