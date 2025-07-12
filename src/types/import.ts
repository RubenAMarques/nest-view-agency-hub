export interface ImportRecord {
  id: string;
  import_date: string;
  file_name: string;
  num_listings: number;
  listings_inserted?: number;
  status: string;
}

export interface ParsedListing {
  title?: string;
  description?: string;
  city?: string;
  zipcode?: string;
  street?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  price?: number;
  offer_type?: string;
  living_area?: number;
  rooms?: number;
  property_type?: string;
  images?: string[];
  xml_data: {
    original_id?: string;
    raw_xml: string;
  };
}