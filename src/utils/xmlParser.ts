import { ParsedListing } from '@/types/import';

const getElementByTagName = (parent: Element, tagName: string): Element | null => {
  const elements = parent.getElementsByTagName(tagName);
  return elements.length > 0 ? elements[0] : null;
};

const getElementTextContent = (element: Element | null): string | undefined => {
  return element?.textContent?.trim() || undefined;
};

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

    // Extract basic property info
    const freitexte = getElementByTagName(immobilie, "freitexte");
    if (freitexte) {
      const objekttitel = getElementByTagName(freitexte, "objekttitel");
      listing.title = getElementTextContent(objekttitel);

      const dreizeiler = getElementByTagName(freitexte, "dreizeiler");
      if (!listing.description) {
        listing.description = getElementTextContent(dreizeiler);
      }

      const objektbeschreibung = getElementByTagName(freitexte, "objektbeschreibung");
      if (!listing.description) {
        listing.description = getElementTextContent(objektbeschreibung);
      }
    }

    // Extract address
    const geo = getElementByTagName(immobilie, "geo");
    if (geo) {
      const ort = getElementByTagName(geo, "ort");
      listing.city = getElementTextContent(ort);

      const plz = getElementByTagName(geo, "plz");
      listing.zipcode = getElementTextContent(plz);

      const strasse = getElementByTagName(geo, "strasse");
      listing.street = getElementTextContent(strasse);

      const land = getElementByTagName(geo, "land");
      listing.country = getElementTextContent(land);

      // Coordinates
      const breitengrad = getElementByTagName(geo, "breitengrad");
      const laengengrad = getElementByTagName(geo, "laengengrad");
      if (breitengrad?.textContent) {
        listing.latitude = parseFloat(breitengrad.textContent);
      }
      if (laengengrad?.textContent) {
        listing.longitude = parseFloat(laengengrad.textContent);
      }
    }

    // Extract prices
    const preise = getElementByTagName(immobilie, "preise");
    if (preise) {
      const kaufpreis = getElementByTagName(preise, "kaufpreis");
      const nettokaltmiete = getElementByTagName(preise, "nettokaltmiete");
      
      if (kaufpreis?.textContent) {
        listing.price = parseFloat(kaufpreis.textContent);
        listing.offer_type = 'sale';
      } else if (nettokaltmiete?.textContent) {
        listing.price = parseFloat(nettokaltmiete.textContent);
        listing.offer_type = 'rent';
      }
    }

    // Extract areas and rooms
    const flaechen = getElementByTagName(immobilie, "flaechen");
    if (flaechen) {
      const wohnflaeche = getElementByTagName(flaechen, "wohnflaeche");
      if (wohnflaeche?.textContent) {
        listing.living_area = parseFloat(wohnflaeche.textContent);
      }
    }

    const ausstattung = getElementByTagName(immobilie, "ausstattung");
    if (ausstattung) {
      const anzahlZimmer = getElementByTagName(ausstattung, "anzahl_zimmer");
      if (anzahlZimmer?.textContent) {
        listing.rooms = parseInt(anzahlZimmer.textContent);
      }
    }

    // Extract property type
    const objektkategorie = getElementByTagName(immobilie, "objektkategorie");
    if (objektkategorie) {
      const objektart = getElementByTagName(objektkategorie, "objektart");
      
      if (objektart) {
        const wohnung = getElementByTagName(objektart, "wohnung");
        const haus = getElementByTagName(objektart, "haus");
        const grundstueck = getElementByTagName(objektart, "grundstueck");
        
        if (wohnung) listing.property_type = 'apartment';
        else if (haus) listing.property_type = 'house';
        else if (grundstueck) listing.property_type = 'land';
      }
    }

    // Extract images from anhang elements
    const images: string[] = [];
    const anhaengeElements = immobilie.getElementsByTagName('anhang');
    
    Array.from(anhaengeElements).forEach((anhang) => {
      const gruppe = anhang.getAttribute('gruppe');
      if (gruppe === 'BILDER') {
        const datenElements = anhang.getElementsByTagName('daten');
        Array.from(datenElements).forEach((daten) => {
          const formatElement = getElementByTagName(daten, 'format');
          const pfadElement = getElementByTagName(daten, 'pfad');
          
          if (formatElement && pfadElement) {
            const format = getElementTextContent(formatElement);
            const pfad = getElementTextContent(pfadElement);
            
            // Check if it's an image format and has a path
            if (format && pfad && format.toLowerCase().startsWith('image/')) {
              images.push(pfad);
            }
          }
        });
      }
    });
    
    listing.images = images;

    // Store original XML data for unmapped fields
    listing.xml_data = {
      original_id: immobilie.getAttribute('id') || undefined,
      raw_xml: immobilie.outerHTML
    };

    listings.push(listing);
  });

  return listings;
};