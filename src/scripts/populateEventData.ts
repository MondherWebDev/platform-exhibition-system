import { db } from '../firebaseConfig';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';

interface ExhibitorData {
  id: string;
  name: string;
  description: string;
  boothId: string;
  logoUrl: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  industry?: string;
  companySize?: string;
  tags?: string[];
  address?: string;
}

interface SponsorData {
  id: string;
  name: string;
  tier: "gold" | "silver" | "bronze";
  logoUrl: string;
  website?: string;
  description?: string;
}

interface HostedBuyerData {
  id: string;
  name: string;
  company: string;
  position?: string;
  photoUrl?: string;
  email?: string;
  phone?: string;
  notes?: string;
  interests?: string[];
}

interface SpeakerData {
  id: string;
  name: string;
  title: string;
  company: string;
  photoUrl?: string;
  bio?: string;
  tags?: string[];
  linkedin?: string;
  twitter?: string;
}

const sampleExhibitors: ExhibitorData[] = [
  {
    id: "qatar-airways",
    name: "Qatar Airways",
    description: "Qatar Airways is the state-owned flag carrier of Qatar, headquartered in Doha. It operates a hub-and-spoke network, linking over 150 international destinations across Africa, Asia, Europe, the Americas, and Oceania from its base at Hamad International Airport.",
    boothId: "A1",
    logoUrl: "https://logos-world.net/wp-content/uploads/2020/03/Qatar-Airways-Logo.png",
    website: "https://qatarairways.com",
    contactEmail: "events@qatarairways.com",
    contactPhone: "+974 4022 6000",
    industry: "Aviation",
    companySize: "10000+",
    tags: ["Premium Airline", "Global Network", "Award Winning"],
    address: "Qatar Airways Tower, Doha, Qatar"
  },
  {
    id: "emirates",
    name: "Emirates",
    description: "Emirates is an international airline based in Dubai, UAE. The airline is a subsidiary of The Emirates Group, which is owned by the government of Dubai's Investment Corporation of Dubai.",
    boothId: "A2",
    logoUrl: "https://1000logos.net/wp-content/uploads/2017/02/Emirates-Logo.png",
    website: "https://emirates.com",
    contactEmail: "business@emirates.com",
    contactPhone: "+971 600 555 555",
    industry: "Aviation",
    companySize: "5000+",
    tags: ["Middle East Hub", "Luxury Travel", "Global Routes"],
    address: "Emirates Group Headquarters, Dubai, UAE"
  },
  {
    id: "marriott-international",
    name: "Marriott International",
    description: "Marriott International is an American multinational diversified hospitality company that manages and franchises a broad portfolio of hotels and related lodging facilities.",
    boothId: "B1",
    logoUrl: "https://logos-world.net/wp-content/uploads/2020/10/Marriott-Logo.png",
    website: "https://marriott.com",
    contactEmail: "sales@marriott.com",
    contactPhone: "+1 301 380 3000",
    industry: "Hospitality",
    companySize: "10000+",
    tags: ["Luxury Hotels", "Global Presence", "Premium Service"],
    address: "7750 Wisconsin Ave, Bethesda, MD 20814, USA"
  },
  {
    id: "hilton",
    name: "Hilton",
    description: "Hilton is a global brand of full-service hotels and resorts and the flagship brand of American multinational hospitality company Hilton.",
    boothId: "B2",
    logoUrl: "https://logos-world.net/wp-content/uploads/2020/10/Hilton-Logo.png",
    website: "https://hilton.com",
    contactEmail: "development@hilton.com",
    contactPhone: "+1 703 883 1000",
    industry: "Hospitality",
    companySize: "10000+",
    tags: ["Full Service Hotels", "Global Network", "Premium Brands"],
    address: "7930 Jones Branch Dr, McLean, VA 22102, USA"
  },
  {
    id: "booking-com",
    name: "Booking.com",
    description: "Booking.com is one of the world's leading digital travel companies, providing booking services for accommodations, flights, and other travel experiences.",
    boothId: "C1",
    logoUrl: "https://logos-world.net/wp-content/uploads/2020/10/Booking-Logo.png",
    website: "https://booking.com",
    contactEmail: "partners@booking.com",
    contactPhone: "+31 20 709 1111",
    industry: "Travel Technology",
    companySize: "1000+",
    tags: ["Online Booking", "Travel Platform", "Global Reach"],
    address: "Oosterdokskade 163, 1011 DL Amsterdam, Netherlands"
  },
  {
    id: "expedia",
    name: "Expedia Group",
    description: "Expedia Group is an American online travel shopping company for consumer and small business travel. Its websites, which are primarily travel fare aggregators and travel metasearch engines.",
    boothId: "C2",
    logoUrl: "https://logos-world.net/wp-content/uploads/2020/10/Expedia-Logo.png",
    website: "https://expedia.com",
    contactEmail: "business@expedia.com",
    contactPhone: "+1 206 481 7200",
    industry: "Travel Technology",
    companySize: "1000+",
    tags: ["Travel Booking", "Meta Search", "Technology Platform"],
    address: "1111 Expedia Group Way W, Seattle, WA 98119, USA"
  },
  {
    id: "royal-caribbean",
    name: "Royal Caribbean International",
    description: "Royal Caribbean International is a cruise line brand founded in Norway and based in Miami, Florida, United States. It is the largest cruise line by revenue and second largest by passengers counts.",
    boothId: "D1",
    logoUrl: "https://logos-world.net/wp-content/uploads/2020/10/Royal-Caribbean-Logo.png",
    website: "https://royalcaribbean.com",
    contactEmail: "groups@rccl.com",
    contactPhone: "+1 305 539 6000",
    industry: "Cruise Line",
    companySize: "5000+",
    tags: ["Cruise Vacations", "Luxury Ships", "Global Destinations"],
    address: "1050 Caribbean Way, Miami, FL 33132, USA"
  },
  {
    id: "carnival-cruise",
    name: "Carnival Cruise Line",
    description: "Carnival Cruise Line is an international cruise line with headquarters in Doral, Florida. The company is a subsidiary of Carnival Corporation & plc.",
    boothId: "D2",
    logoUrl: "https://logos-world.net/wp-content/uploads/2020/10/Carnival-Cruise-Line-Logo.png",
    website: "https://carnival.com",
    contactEmail: "travelagents@carnival.com",
    contactPhone: "+1 800 764 7419",
    industry: "Cruise Line",
    companySize: "10000+",
    tags: ["Fun Ships", "Family Cruises", "Entertainment"],
    address: "3655 NW 87th Ave, Miami, FL 33178, USA"
  }
];

const sampleSponsors: SponsorData[] = [
  {
    id: "qatar-tourism",
    name: "Qatar Tourism Authority",
    tier: "gold",
    logoUrl: "https://www.qatartourism.com/images/logo.png",
    website: "https://qatartourism.com",
    description: "Official tourism authority promoting Qatar as a premier travel destination"
  },
  {
    id: "doha-hamad-airport",
    name: "Hamad International Airport",
    tier: "gold",
    logoUrl: "https://www.dohahamadairport.com/images/logo.png",
    website: "https://dohahamadairport.com",
    description: "World-class airport serving as the gateway to Qatar"
  },
  {
    id: "qatar-airways-2",
    name: "Qatar Airways",
    tier: "gold",
    logoUrl: "https://logos-world.net/wp-content/uploads/2020/03/Qatar-Airways-Logo.png",
    website: "https://qatarairways.com",
    description: "Premium airline partner and gold sponsor"
  },
  {
    id: "emirates-2",
    name: "Emirates",
    tier: "silver",
    logoUrl: "https://1000logos.net/wp-content/uploads/2017/02/Emirates-Logo.png",
    website: "https://emirates.com",
    description: "International airline and silver sponsor"
  },
  {
    id: "marriott-2",
    name: "Marriott International",
    tier: "silver",
    logoUrl: "https://logos-world.net/wp-content/uploads/2020/10/Marriott-Logo.png",
    website: "https://marriott.com",
    description: "Global hospitality partner"
  },
  {
    id: "visa",
    name: "Visa",
    tier: "bronze",
    logoUrl: "https://logos-world.net/wp-content/uploads/2020/10/Visa-Logo.png",
    website: "https://visa.com",
    description: "Global payment technology partner"
  }
];

const sampleHostedBuyers: HostedBuyerData[] = [
  {
    id: "sarah-johnson",
    name: "Sarah Johnson",
    company: "Luxury Travel Solutions Ltd",
    position: "CEO",
    photoUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    email: "sarah@luxurytravelsolutions.com",
    phone: "+44 20 7123 4567",
    notes: "High-value luxury travel buyer, interested in premium destinations and exclusive experiences",
    interests: ["Luxury Travel", "Premium Destinations", "Exclusive Experiences", "Private Jets"]
  },
  {
    id: "mohammed-al-zahra",
    name: "Mohammed Al-Zahra",
    company: "Gulf Business Travel",
    position: "Procurement Director",
    photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    email: "mohammed@gulfbusinesstravel.com",
    phone: "+971 50 123 4567",
    notes: "Corporate travel buyer for major Gulf region companies, focuses on business class and MICE travel",
    interests: ["Business Travel", "MICE", "Corporate Packages", "Premium Airlines"]
  },
  {
    id: "anna-kowalski",
    name: "Anna Kowalski",
    company: "European Tour Operators Association",
    position: "Senior Buyer",
    photoUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    email: "anna.kowalski@etoa.org",
    phone: "+48 22 123 4567",
    notes: "Represents multiple European tour operators, looking for new destinations and partnerships",
    interests: ["Tour Packages", "Destination Marketing", "Partnership Opportunities", "Cultural Tourism"]
  },
  {
    id: "david-wong",
    name: "David Wong",
    company: "Asia Pacific Travel Consortium",
    position: "Regional Manager",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    email: "david.wong@aptc.com",
    phone: "+65 9123 4567",
    notes: "Focuses on Asia-Pacific market, interested in regional travel packages and partnerships",
    interests: ["Regional Travel", "Asia-Pacific Market", "Travel Packages", "Cultural Exchange"]
  },
  {
    id: "maria-rodriguez",
    name: "Maria Rodriguez",
    company: "Latin American Travel Network",
    position: "Business Development Director",
    photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
    email: "maria.rodriguez@latn.com",
    phone: "+52 55 1234 5678",
    notes: "Specializes in Latin American outbound travel, looking for premium travel products",
    interests: ["Outbound Travel", "Premium Products", "Latin American Market", "Adventure Travel"]
  }
];

const sampleSpeakers: SpeakerData[] = [
  {
    id: "akbar-al-baker",
    name: "Akbar Al Baker",
    title: "CEO",
    company: "Qatar Airways",
    photoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face",
    bio: "CEO of Qatar Airways with over 25 years of experience in aviation industry. Led the transformation of Qatar Airways into one of the world's leading airlines.",
    tags: ["Aviation", "Leadership", "Business Strategy"],
    linkedin: "https://linkedin.com/in/akbar-al-baker"
  },
  {
    id: "bertrand-piccard",
    name: "Bertrand Piccard",
    title: "Founder & Chairman",
    company: "Solar Impulse Foundation",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    bio: "Swiss psychiatrist and aeronaut who made the first circumnavigation of the Earth in a solar-powered plane. Pioneer in sustainable aviation and clean technologies.",
    tags: ["Sustainability", "Innovation", "Clean Technology"],
    linkedin: "https://linkedin.com/in/bertrand-piccard"
  },
  {
    id: "gloria-guevara",
    name: "Gloria Guevara",
    title: "Chief Special Advisor",
    company: "Saudi Arabia Ministry of Tourism",
    photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
    bio: "Former CEO of World Travel & Tourism Council (WTTC). Leading expert in tourism policy and sustainable tourism development.",
    tags: ["Tourism Policy", "Sustainability", "Government Relations"],
    linkedin: "https://linkedin.com/in/gloria-guevara"
  },
  {
    id: "arthur-frommer",
    name: "Arthur Frommer",
    title: "Founder",
    company: "Frommer's Travel Guides",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    bio: "Legendary travel writer and entrepreneur who revolutionized travel publishing. Creator of the Frommer's travel guide series.",
    tags: ["Travel Writing", "Publishing", "Travel Industry"],
    linkedin: "https://linkedin.com/in/arthur-frommer"
  },
  {
    id: "sally-greenberg",
    name: "Sally Greenberg",
    title: "VP Sustainability",
    company: "Marriott International",
    photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
    bio: "Leading Marriott's global sustainability initiatives. Expert in sustainable hospitality and environmental responsibility in the hotel industry.",
    tags: ["Sustainability", "Hospitality", "Environmental Management"],
    linkedin: "https://linkedin.com/in/sally-greenberg"
  }
];

async function populateEventData() {
  try {
    // Get the current event ID from global settings
    const globalSettingsDoc = await getDoc(doc(db, 'AppSettings', 'global'));
    let eventId = 'default';

    if (globalSettingsDoc.exists()) {
      const settings = globalSettingsDoc.data();
      eventId = settings.eventId || 'default';
    }

    console.log(`📊 Populating event data for event: ${eventId}`);

    // Add exhibitors
    console.log('🏢 Adding exhibitors...');
    for (const exhibitor of sampleExhibitors) {
      await setDoc(doc(db, 'Events', eventId, 'Exhibitors', exhibitor.id), {
        ...exhibitor,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`✅ Added exhibitor: ${exhibitor.name}`);
    }

    // Add sponsors
    console.log('🏆 Adding sponsors...');
    for (const sponsor of sampleSponsors) {
      await setDoc(doc(db, 'Events', eventId, 'Sponsors', sponsor.id), {
        ...sponsor,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`✅ Added sponsor: ${sponsor.name} (${sponsor.tier})`);
    }

    // Add hosted buyers
    console.log('👑 Adding hosted buyers...');
    for (const buyer of sampleHostedBuyers) {
      await setDoc(doc(db, 'Events', eventId, 'HostedBuyers', buyer.id), {
        ...buyer,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`✅ Added hosted buyer: ${buyer.name}`);
    }

    // Add speakers
    console.log('🎤 Adding speakers...');
    for (const speaker of sampleSpeakers) {
      await setDoc(doc(db, 'Events', eventId, 'Speakers', speaker.id), {
        ...speaker,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`✅ Added speaker: ${speaker.name}`);
    }

    console.log('🎉 Event data population completed successfully!');
    console.log(`📈 Dashboard should now show:`);
    console.log(`   • ${sampleExhibitors.length} exhibitors`);
    console.log(`   • ${sampleSponsors.length} sponsors`);
    console.log(`   • ${sampleHostedBuyers.length} hosted buyers`);
    console.log(`   • ${sampleSpeakers.length} speakers`);

  } catch (error) {
    console.error('❌ Error populating event data:', error);
  }
}

// Run the population script
populateEventData();
