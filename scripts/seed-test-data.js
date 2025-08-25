const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB client
const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'ca-central-1'
});

const docClient = DynamoDBDocumentClient.from(client);

// Test data for organizers
const testOrganizers = [
  {
    id: 'org-001',
    email: 'musicfest@example.com',
    username: 'musicfest_org',
    firstName: 'Sarah',
    lastName: 'Johnson',
    companyName: 'Music Festivals Inc',
    phone: '+1-416-555-0101',
    role: 'organizer',
    verified: true,
    profilePicture: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    bio: 'Leading music festival organizer with 10+ years of experience',
    website: 'https://musicfestivals.com',
    socialMedia: {
      facebook: 'https://facebook.com/musicfestivals',
      instagram: 'https://instagram.com/musicfestivals',
      twitter: 'https://twitter.com/musicfestivals'
    }
  },
  {
    id: 'org-002',
    email: 'techconf@example.com',
    username: 'techconf_org',
    firstName: 'Michael',
    lastName: 'Chen',
    companyName: 'Tech Conferences Canada',
    phone: '+1-416-555-0102',
    role: 'organizer',
    verified: true,
    profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    bio: 'Technology conference specialist focusing on AI and innovation',
    website: 'https://techconferences.ca',
    socialMedia: {
      linkedin: 'https://linkedin.com/company/techconferences',
      twitter: 'https://twitter.com/techconf_ca'
    }
  },
  {
    id: 'org-003',
    email: 'sportsevents@example.com',
    username: 'sportsevents_org',
    firstName: 'David',
    lastName: 'Rodriguez',
    companyName: 'Sports Events Toronto',
    phone: '+1-416-555-0103',
    role: 'organizer',
    verified: true,
    profilePicture: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    bio: 'Professional sports event organizer and former athlete',
    website: 'https://sportsevents.to',
    socialMedia: {
      instagram: 'https://instagram.com/sportsevents_to',
      facebook: 'https://facebook.com/sportsevents'
    }
  },
  {
    id: 'org-004',
    email: 'foodfestival@example.com',
    username: 'foodfestival_org',
    firstName: 'Emma',
    lastName: 'Thompson',
    companyName: 'Toronto Food Festival',
    phone: '+1-416-555-0104',
    role: 'organizer',
    verified: true,
    profilePicture: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',
    bio: 'Culinary event specialist and food culture enthusiast',
    website: 'https://torontofoodfestival.com',
    socialMedia: {
      instagram: 'https://instagram.com/torontofoodfest',
      facebook: 'https://facebook.com/torontofoodfestival'
    }
  },
  {
    id: 'org-005',
    email: 'artgallery@example.com',
    username: 'artgallery_org',
    firstName: 'Lisa',
    lastName: 'Wang',
    companyName: 'Contemporary Art Gallery',
    phone: '+1-416-555-0105',
    role: 'organizer',
    verified: true,
    profilePicture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    bio: 'Contemporary art curator and gallery owner',
    website: 'https://contemporaryartgallery.ca',
    socialMedia: {
      instagram: 'https://instagram.com/contemporaryart',
      facebook: 'https://facebook.com/contemporaryartgallery'
    }
  },
  {
    id: 'org-006',
    email: 'businesssummit@example.com',
    username: 'businesssummit_org',
    firstName: 'James',
    lastName: 'Wilson',
    companyName: 'Canadian Business Summit',
    phone: '+1-416-555-0106',
    role: 'organizer',
    verified: true,
    profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    bio: 'Business development expert and summit organizer',
    website: 'https://canadianbusinesssummit.com',
    socialMedia: {
      linkedin: 'https://linkedin.com/company/canadianbusinesssummit',
      twitter: 'https://twitter.com/canbizsummit'
    }
  },
  {
    id: 'org-007',
    email: 'wellnessretreat@example.com',
    username: 'wellnessretreat_org',
    firstName: 'Maria',
    lastName: 'Garcia',
    companyName: 'Wellness Retreats Canada',
    phone: '+1-416-555-0107',
    role: 'organizer',
    verified: true,
    profilePicture: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    bio: 'Wellness and mindfulness retreat specialist',
    website: 'https://wellnessretreats.ca',
    socialMedia: {
      instagram: 'https://instagram.com/wellnessretreats_ca',
      facebook: 'https://facebook.com/wellnessretreats'
    }
  },
  {
    id: 'org-008',
    email: 'startupmeetup@example.com',
    username: 'startupmeetup_org',
    firstName: 'Alex',
    lastName: 'Brown',
    companyName: 'Toronto Startup Community',
    phone: '+1-416-555-0108',
    role: 'organizer',
    verified: true,
    profilePicture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    bio: 'Startup ecosystem builder and community organizer',
    website: 'https://torontostartupcommunity.com',
    socialMedia: {
      linkedin: 'https://linkedin.com/company/torontostartup',
      twitter: 'https://twitter.com/torontostartup'
    }
  },
  {
    id: 'org-009',
    email: 'filmfestival@example.com',
    username: 'filmfestival_org',
    firstName: 'Rachel',
    lastName: 'Davis',
    companyName: 'Toronto Film Festival',
    phone: '+1-416-555-0109',
    role: 'organizer',
    verified: true,
    profilePicture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    bio: 'Independent film festival curator and filmmaker',
    website: 'https://torontofilmfestival.ca',
    socialMedia: {
      instagram: 'https://instagram.com/torontofilmfest',
      facebook: 'https://facebook.com/torontofilmfestival'
    }
  },
  {
    id: 'org-010',
    email: 'charitygala@example.com',
    username: 'charitygala_org',
    firstName: 'Robert',
    lastName: 'Anderson',
    companyName: 'Charity Events Foundation',
    phone: '+1-416-555-0110',
    role: 'organizer',
    verified: true,
    profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    bio: 'Non-profit event organizer and community advocate',
    website: 'https://charityeventsfoundation.org',
    socialMedia: {
      facebook: 'https://facebook.com/charityeventsfoundation',
      instagram: 'https://instagram.com/charityevents'
    }
  }
];

// Test data for events
const testEvents = [
  {
    id: 'event-001',
    title: 'Summer Music Festival 2024',
    description: 'Join us for the biggest summer music festival featuring top artists from around the world. Three days of amazing music, food, and entertainment in the heart of Toronto.',
    startDate: '2024-07-15T18:00:00Z',
    endDate: '2024-07-17T23:00:00Z',
    organizerId: 'org-001',
    category: 'music',
    location: {
      address: 'Exhibition Place',
      city: 'Toronto',
      province: 'ON',
      country: 'Canada',
      postalCode: 'M6K 3C3',
      coordinates: {
        latitude: 43.6305,
        longitude: -79.4204
      }
    },
    pricing: [
      {
        ticketType: 'general',
        price: 89.99,
        currency: 'CAD',
        available: 5000,
        description: 'General admission for all three days'
      },
      {
        ticketType: 'vip',
        price: 299.99,
        currency: 'CAD',
        available: 500,
        description: 'VIP access with premium seating and exclusive areas'
      }
    ],
    maxAttendees: 10000,
    currentAttendees: 2500,
    status: 'published',
    images: [
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800'
    ],
    tags: ['music', 'festival', 'summer', 'live-music'],
    features: ['parking', 'food', 'drinks', 'merchandise', 'vip-lounge']
  },
  {
    id: 'event-002',
    title: 'Tech Innovation Summit 2024',
    description: 'The premier technology conference bringing together industry leaders, innovators, and entrepreneurs to discuss the future of AI, blockchain, and emerging technologies.',
    startDate: '2024-09-20T09:00:00Z',
    endDate: '2024-09-22T18:00:00Z',
    organizerId: 'org-002',
    category: 'technology',
    location: {
      address: 'Metro Toronto Convention Centre',
      city: 'Toronto',
      province: 'ON',
      country: 'Canada',
      postalCode: 'M5V 3A9',
      coordinates: {
        latitude: 43.6426,
        longitude: -79.3871
      }
    },
    pricing: [
      {
        ticketType: 'early-bird',
        price: 299.99,
        currency: 'CAD',
        available: 200,
        description: 'Early bird registration (limited time)'
      },
      {
        ticketType: 'regular',
        price: 499.99,
        currency: 'CAD',
        available: 800,
        description: 'Regular conference pass'
      },
      {
        ticketType: 'workshop',
        price: 799.99,
        currency: 'CAD',
        available: 100,
        description: 'Conference pass + hands-on workshops'
      }
    ],
    maxAttendees: 1200,
    currentAttendees: 450,
    status: 'published',
    images: [
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
    ],
    tags: ['technology', 'ai', 'innovation', 'conference', 'startup'],
    features: ['networking', 'workshops', 'exhibition', 'catering']
  },
  {
    id: 'event-003',
    title: 'Toronto Marathon 2024',
    description: 'Join thousands of runners in the annual Toronto Marathon. Choose from full marathon, half marathon, or 10K race through the beautiful streets of Toronto.',
    startDate: '2024-10-20T07:00:00Z',
    endDate: '2024-10-20T14:00:00Z',
    organizerId: 'org-003',
    category: 'sports',
    location: {
      address: 'Nathan Phillips Square',
      city: 'Toronto',
      province: 'ON',
      country: 'Canada',
      postalCode: 'M5H 2N2',
      coordinates: {
        latitude: 43.6532,
        longitude: -79.3832
      }
    },
    pricing: [
      {
        ticketType: '10k',
        price: 45.00,
        currency: 'CAD',
        available: 2000,
        description: '10K race registration'
      },
      {
        ticketType: 'half-marathon',
        price: 75.00,
        currency: 'CAD',
        available: 3000,
        description: 'Half marathon registration'
      },
      {
        ticketType: 'full-marathon',
        price: 95.00,
        currency: 'CAD',
        available: 2000,
        description: 'Full marathon registration'
      }
    ],
    maxAttendees: 10000,
    currentAttendees: 3200,
    status: 'published',
    images: [
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800'
    ],
    tags: ['sports', 'running', 'marathon', 'fitness', 'charity'],
    features: ['medal', 't-shirt', 'refreshments', 'medical-support']
  },
  {
    id: 'event-004',
    title: 'Toronto Food & Wine Festival',
    description: 'A culinary celebration featuring the best restaurants, wineries, and food artisans from across Ontario. Taste, learn, and celebrate the vibrant food culture of Toronto.',
    startDate: '2024-08-10T11:00:00Z',
    endDate: '2024-08-12T22:00:00Z',
    organizerId: 'org-004',
    category: 'food',
    location: {
      address: 'Harbourfront Centre',
      city: 'Toronto',
      province: 'ON',
      country: 'Canada',
      postalCode: 'M5J 2T2',
      coordinates: {
        latitude: 43.6289,
        longitude: -79.3777
      }
    },
    pricing: [
      {
        ticketType: 'single-day',
        price: 65.00,
        currency: 'CAD',
        available: 1500,
        description: 'Single day pass with food samples'
      },
      {
        ticketType: 'weekend',
        price: 120.00,
        currency: 'CAD',
        available: 1000,
        description: 'Full weekend pass with unlimited samples'
      },
      {
        ticketType: 'vip',
        price: 250.00,
        currency: 'CAD',
        available: 200,
        description: 'VIP access with exclusive tastings and chef meet-and-greets'
      }
    ],
    maxAttendees: 3000,
    currentAttendees: 1200,
    status: 'published',
    images: [
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
      'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=800'
    ],
    tags: ['food', 'wine', 'culinary', 'festival', 'tasting'],
    features: ['food-samples', 'wine-tasting', 'cooking-demos', 'live-music']
  },
  {
    id: 'event-005',
    title: 'Contemporary Art Exhibition',
    description: 'An immersive contemporary art exhibition featuring works from emerging and established artists. Experience art in new and innovative ways.',
    startDate: '2024-11-15T10:00:00Z',
    endDate: '2024-12-15T18:00:00Z',
    organizerId: 'org-005',
    category: 'arts',
    location: {
      address: 'Art Gallery of Ontario',
      city: 'Toronto',
      province: 'ON',
      country: 'Canada',
      postalCode: 'M5T 1G1',
      coordinates: {
        latitude: 43.6537,
        longitude: -79.3929
      }
    },
    pricing: [
      {
        ticketType: 'adult',
        price: 25.00,
        currency: 'CAD',
        available: 500,
        description: 'Adult admission'
      },
      {
        ticketType: 'student',
        price: 15.00,
        currency: 'CAD',
        available: 300,
        description: 'Student admission (ID required)'
      },
      {
        ticketType: 'family',
        price: 60.00,
        currency: 'CAD',
        available: 200,
        description: 'Family pass (2 adults + 2 children)'
      }
    ],
    maxAttendees: 2000,
    currentAttendees: 800,
    status: 'published',
    images: [
      'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800'
    ],
    tags: ['art', 'contemporary', 'exhibition', 'culture', 'gallery'],
    features: ['guided-tours', 'artist-talks', 'workshops', 'gift-shop']
  },
  {
    id: 'event-006',
    title: 'Canadian Business Leadership Summit',
    description: 'Connect with Canada\'s top business leaders, entrepreneurs, and investors. Learn about the latest trends in business strategy, innovation, and leadership.',
    startDate: '2024-06-25T08:00:00Z',
    endDate: '2024-06-27T17:00:00Z',
    organizerId: 'org-006',
    category: 'business',
    location: {
      address: 'Fairmont Royal York',
      city: 'Toronto',
      province: 'ON',
      country: 'Canada',
      postalCode: 'M5H 2E7',
      coordinates: {
        latitude: 43.6487,
        longitude: -79.3775
      }
    },
    pricing: [
      {
        ticketType: 'early-bird',
        price: 899.99,
        currency: 'CAD',
        available: 100,
        description: 'Early bird registration (limited)'
      },
      {
        ticketType: 'regular',
        price: 1299.99,
        currency: 'CAD',
        available: 400,
        description: 'Regular summit pass'
      },
      {
        ticketType: 'premium',
        price: 1999.99,
        currency: 'CAD',
        available: 100,
        description: 'Premium pass with exclusive networking events'
      }
    ],
    maxAttendees: 600,
    currentAttendees: 280,
    status: 'published',
    images: [
      'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800'
    ],
    tags: ['business', 'leadership', 'networking', 'strategy', 'innovation'],
    features: ['networking', 'workshops', 'keynotes', 'exhibition', 'catering']
  },
  {
    id: 'event-007',
    title: 'Mindfulness & Wellness Retreat',
    description: 'Escape the city and reconnect with yourself at our peaceful wellness retreat. Experience yoga, meditation, and holistic healing in a serene natural setting.',
    startDate: '2024-07-05T14:00:00Z',
    endDate: '2024-07-07T12:00:00Z',
    organizerId: 'org-007',
    category: 'wellness',
    location: {
      address: 'Muskoka Lakes',
      city: 'Muskoka',
      province: 'ON',
      country: 'Canada',
      postalCode: 'P1H 2J6',
      coordinates: {
        latitude: 45.3269,
        longitude: -79.2163
      }
    },
    pricing: [
      {
        ticketType: 'shared-room',
        price: 399.99,
        currency: 'CAD',
        available: 50,
        description: 'Shared accommodation and all activities'
      },
      {
        ticketType: 'private-room',
        price: 599.99,
        currency: 'CAD',
        available: 25,
        description: 'Private room and all activities'
      },
      {
        ticketType: 'luxury-cabin',
        price: 899.99,
        currency: 'CAD',
        available: 10,
        description: 'Luxury cabin with private amenities'
      }
    ],
    maxAttendees: 100,
    currentAttendees: 45,
    status: 'published',
    images: [
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800'
    ],
    tags: ['wellness', 'yoga', 'meditation', 'retreat', 'mindfulness'],
    features: ['accommodation', 'meals', 'yoga-classes', 'meditation', 'spa']
  },
  {
    id: 'event-008',
    title: 'Toronto Startup Meetup',
    description: 'Join the vibrant Toronto startup community for networking, pitch sessions, and discussions about the latest trends in entrepreneurship and innovation.',
    startDate: '2024-08-28T18:00:00Z',
    endDate: '2024-08-28T21:00:00Z',
    organizerId: 'org-008',
    category: 'startup',
    location: {
      address: 'MaRS Discovery District',
      city: 'Toronto',
      province: 'ON',
      country: 'Canada',
      postalCode: 'M5G 1L7',
      coordinates: {
        latitude: 43.6591,
        longitude: -79.3862
      }
    },
    pricing: [
      {
        ticketType: 'free',
        price: 0.00,
        currency: 'CAD',
        available: 200,
        description: 'Free community meetup'
      },
      {
        ticketType: 'premium',
        price: 25.00,
        currency: 'CAD',
        available: 50,
        description: 'Premium access with exclusive networking'
      }
    ],
    maxAttendees: 250,
    currentAttendees: 180,
    status: 'published',
    images: [
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800'
    ],
    tags: ['startup', 'networking', 'entrepreneurship', 'innovation', 'pitch'],
    features: ['networking', 'pitch-sessions', 'refreshments', 'mentorship']
  },
  {
    id: 'event-009',
    title: 'Independent Film Festival',
    description: 'Celebrate independent cinema with screenings of award-winning films, Q&A sessions with directors, and networking opportunities with industry professionals.',
    startDate: '2024-09-15T14:00:00Z',
    endDate: '2024-09-22T23:00:00Z',
    organizerId: 'org-009',
    category: 'film',
    location: {
      address: 'TIFF Bell Lightbox',
      city: 'Toronto',
      province: 'ON',
      country: 'Canada',
      postalCode: 'M5V 3X8',
      coordinates: {
        latitude: 43.6487,
        longitude: -79.3775
      }
    },
    pricing: [
      {
        ticketType: 'single-screening',
        price: 15.00,
        currency: 'CAD',
        available: 500,
        description: 'Single film screening'
      },
      {
        ticketType: 'day-pass',
        price: 45.00,
        currency: 'CAD',
        available: 200,
        description: 'All screenings for one day'
      },
      {
        ticketType: 'festival-pass',
        price: 150.00,
        currency: 'CAD',
        available: 100,
        description: 'Access to all screenings and events'
      }
    ],
    maxAttendees: 1000,
    currentAttendees: 350,
    status: 'published',
    images: [
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800'
    ],
    tags: ['film', 'independent', 'cinema', 'festival', 'directors'],
    features: ['film-screenings', 'q-and-a', 'networking', 'awards-ceremony']
  },
  {
    id: 'event-010',
    title: 'Charity Gala Dinner',
    description: 'Join us for an elegant evening of fine dining, live entertainment, and philanthropy. All proceeds support local community programs and initiatives.',
    startDate: '2024-12-07T18:00:00Z',
    endDate: '2024-12-07T23:00:00Z',
    organizerId: 'org-010',
    category: 'charity',
    location: {
      address: 'The Ritz-Carlton Toronto',
      city: 'Toronto',
      province: 'ON',
      country: 'Canada',
      postalCode: 'M5V 3A9',
      coordinates: {
        latitude: 43.6426,
        longitude: -79.3871
      }
    },
    pricing: [
      {
        ticketType: 'individual',
        price: 250.00,
        currency: 'CAD',
        available: 200,
        description: 'Individual gala ticket'
      },
      {
        ticketType: 'couple',
        price: 450.00,
        currency: 'CAD',
        available: 100,
        description: 'Couple ticket package'
      },
      {
        ticketType: 'table',
        price: 2000.00,
        currency: 'CAD',
        available: 20,
        description: 'Table for 8 with premium seating'
      }
    ],
    maxAttendees: 400,
    currentAttendees: 180,
    status: 'published',
    images: [
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
    ],
    tags: ['charity', 'gala', 'philanthropy', 'dinner', 'fundraising'],
    features: ['dinner', 'live-entertainment', 'auction', 'networking', 'valet-parking']
  }
];

// Function to seed organizers
async function seedOrganizers() {
  console.log('🌱 Seeding organizers...');
  
  const organizerItems = testOrganizers.map(organizer => ({
    PutRequest: {
      Item: {
        PK: `USER#${organizer.id}`,
        SK: `USER#${organizer.id}`,
        GSI1PK: `EMAIL#${organizer.email}`,
        GSI1SK: `USER#${organizer.id}`,
        GSI2PK: `USERNAME#${organizer.username}`,
        GSI2SK: `USER#${organizer.id}`,
        GSI3PK: `ROLE#${organizer.role}`,
        GSI3SK: `USER#${organizer.createdAt || new Date().toISOString()}`,
        ...organizer,
        createdAt: organizer.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
  }));

  // Split into batches of 25 (DynamoDB limit)
  const batches = [];
  for (let i = 0; i < organizerItems.length; i += 25) {
    batches.push(organizerItems.slice(i, i + 25));
  }

  for (const batch of batches) {
    try {
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          'UserManagement-dev-dev-users': batch
        }
      }));
      console.log(`✅ Seeded ${batch.length} organizers`);
    } catch (error) {
      console.error('❌ Error seeding organizers:', error);
    }
  }
}

// Function to seed events
async function seedEvents() {
  console.log('🎫 Seeding events...');
  
  const eventItems = testEvents.map(event => ({
    PutRequest: {
      Item: {
        PK: `EVENT#${event.id}`,
        SK: `EVENT#${event.id}`,
        GSI1PK: `ORGANIZER#${event.organizerId}`,
        GSI1SK: `EVENT#${event.createdAt || new Date().toISOString()}`,
        GSI2PK: `CATEGORY#${event.category}`,
        GSI2SK: `EVENT#${event.createdAt || new Date().toISOString()}`,
        GSI3PK: `STATUS#${event.status}`,
        GSI3SK: `EVENT#${event.createdAt || new Date().toISOString()}`,
        ...event,
        createdAt: event.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
  }));

  // Split into batches of 25 (DynamoDB limit)
  const batches = [];
  for (let i = 0; i < eventItems.length; i += 25) {
    batches.push(eventItems.slice(i, i + 25));
  }

  for (const batch of batches) {
    try {
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          'EventManagement-dev-dev-events': batch
        }
      }));
      console.log(`✅ Seeded ${batch.length} events`);
    } catch (error) {
      console.error('❌ Error seeding events:', error);
    }
  }
}

// Main function
async function seedTestData() {
  try {
    console.log('🚀 Starting test data seeding...');
    
    // Seed organizers first
    await seedOrganizers();
    
    // Seed events
    await seedEvents();
    
    console.log('✅ Test data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${testOrganizers.length} organizers created`);
    console.log(`- ${testEvents.length} events created`);
    console.log('\n🎯 Test Data Ready for Mobile App Development!');
    
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
  }
}

// Run the seeding
if (require.main === module) {
  seedTestData();
}

module.exports = { seedTestData, testOrganizers, testEvents };
