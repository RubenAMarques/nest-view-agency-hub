import { ParsedListing } from '@/types/import';

export const parseOpenImmoXml = (xmlText: string): ParsedListing[] => {
  const parser = new DOMParser();
  const sanitized = xmlText.replace(/&(?!amp;|lt;|gt;|apos;|quot;)/g, "&amp;");
  const xmlDoc = parser.parseFromString(sanitized, "text/xml");
  
  // Check for parsing errors
  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    throw new Error("XML inválido");
  }

  const listings: ParsedListing[] = [];
  const immobilien = xmlDoc.getElementsByTagName("immobilie");

  if (immobilien.length === 0) {
    throw new Error("Ficheiro não contém listagens OpenImmo válidas");
  }

  Array.from(immobilien).forEach((immobilie) => {
    const listing: ParsedListing = {
      xml_data: {
        raw_xml: immobilie.outerHTML
      }
    };

    // Extract basic property info using local-name()
    const objekttitel = immobilie.querySelector('[local-name()="freitexte"] [local-name()="objekttitel"]');
    if (objekttitel) listing.title = objekttitel.textContent?.trim();

    const dreizeiler = immobilie.querySelector('[local-name()="freitexte"] [local-name()="dreizeiler"]');
    if (dreizeiler) listing.description = dreizeiler.textContent?.trim();

    // Extract address
    const geo = immobilie.querySelector('[local-name()="geo"]');
    if (geo) {
      const ort = geo.querySelector('[local-name()="ort"]');
      if (ort) listing.city = ort.textContent?.trim();

      const plz = geo.querySelector('[local-name()="plz"]');
      if (plz) listing.zipcode = plz.textContent?.trim();

      const strasse = geo.querySelector('[local-name()="strasse"]');
      if (strasse) listing.street = strasse.textContent?.trim();

      const land = geo.querySelector('[local-name()="land"]');
      if (land) listing.country = land.textContent?.trim();

      // Coordinates
      const breitengrad = geo.querySelector('[local-name()="breitengrad"]');
      const laengengrad = geo.querySelector('[local-name()="laengengrad"]');
      if (breitengrad) listing.latitude = parseFloat(breitengrad.textContent || '0');
      if (laengengrad) listing.longitude = parseFloat(laengengrad.textContent || '0');
    }

    // Extract prices
    const preise = immobilie.querySelector('[local-name()="preise"]');
    if (preise) {
      const kaufpreis = preise.querySelector('[local-name()="kaufpreis"]');
      const nettokaltmiete = preise.querySelector('[local-name()="nettokaltmiete"]');
      
      if (kaufpreis) {
        listing.price = parseFloat(kaufpreis.textContent || '0');
        listing.offer_type = 'sale';
      } else if (nettokaltmiete) {
        listing.price = parseFloat(nettokaltmiete.textContent || '0');
        listing.offer_type = 'rent';
      }
    }

    // Extract areas and rooms
    const flaechen = immobilie.querySelector('[local-name()="flaechen"]');
    if (flaechen) {
      const wohnflaeche = flaechen.querySelector('[local-name()="wohnflaeche"]');
      if (wohnflaeche) listing.living_area = parseFloat(wohnflaeche.textContent || '0');
    }

    const ausstattung = immobilie.querySelector('[local-name()="ausstattung"]');
    if (ausstattung) {
      const anzahlZimmer = ausstattung.querySelector('[local-name()="anzahl_zimmer"]');
      if (anzahlZimmer) listing.rooms = parseInt(anzahlZimmer.textContent || '0');
    }

    // Extract property type
    const objektkategorie = immobilie.querySelector('[local-name()="objektkategorie"]');
    if (objektkategorie) {
      const objektart = objektkategorie.querySelector('[local-name()="objektart"]');
      
      if (objektart) {
        const wohnung = objektart.querySelector('[local-name()="wohnung"]');
        const haus = objektart.querySelector('[local-name()="haus"]');
        const grundstueck = objektart.querySelector('[local-name()="grundstueck"]');
        
        if (wohnung) listing.property_type = 'apartment';
        else if (haus) listing.property_type = 'house';
        else if (grundstueck) listing.property_type = 'land';
      }
    }

    // Store original XML data for unmapped fields
    listing.xml_data = {
      original_id: immobilie.getAttribute('id') || undefined,
      raw_xml: immobilie.outerHTML
    };

    listings.push(listing);
  });

  return listings;
};