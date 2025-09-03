import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const mockOrganizers = [
  {
    id: 'org_001',
    name: 'Tech Events Pro',
    email: 'contact@techeventspro.com',
    country: 'US',
    region: 'CA',
    locale: 'en-US',
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    status: 'active',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'org_002',
    name: 'Global Conference Solutions',
    email: 'info@globalconfs.com',
    country: 'UK',
    region: 'England',
    locale: 'en-GB',
    timezone: 'Europe/London',
    currency: 'GBP',
    status: 'active',
    createdAt: '2024-01-10T14:30:00Z'
  }
];

const mockTeamMembers = [
  {
    id: 'tm_001',
    organizerId: 'org_001',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john@techeventspro.com',
    role: 'admin',
    permissions: ['read', 'write', 'admin'],
    isActive: true,
    joinedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'tm_002',
    organizerId: 'org_001',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah@techeventspro.com',
    role: 'manager',
    permissions: ['read', 'write'],
    isActive: true,
    joinedAt: '2024-01-16T09:00:00Z'
  }
];

const mockCampaigns = [
  {
    id: 'camp_001',
    organizerId: 'org_001',
    name: 'Summer Tech Conference 2024',
    type: 'email',
    status: 'active',
    targeting: {
      countries: ['US', 'CA'],
      ageRange: [25, 45],
      interests: ['technology', 'innovation']
    },
    budget: {
      amount: 5000,
      currency: 'USD',
      spent: 1200
    },
    createdAt: '2024-01-20T08:00:00Z',
    updatedAt: '2024-01-20T08:00:00Z'
  },
  {
    id: 'camp_002',
    organizerId: 'org_001',
    name: 'Q4 Product Launch',
    type: 'social',
    status: 'scheduled',
    targeting: {
      countries: ['US', 'UK', 'CA'],
      ageRange: [30, 50],
      interests: ['business', 'technology']
    },
    budget: {
      amount: 8000,
      currency: 'USD',
      spent: 0
    },
    createdAt: '2024-01-25T15:00:00Z',
    updatedAt: '2024-01-25T15:00:00Z'
  }
];

const mockSupportMessages = [
  {
    id: 'msg_001',
    organizerId: 'org_001',
    subject: 'Ticket Refund Request',
    message: 'Customer is requesting a refund for event cancellation',
    category: 'refund',
    priority: 'high',
    status: 'open',
    createdAt: '2024-01-28T11:00:00Z'
  },
  {
    id: 'msg_002',
    organizerId: 'org_001',
    subject: 'Technical Support',
    message: 'Having issues with the mobile app check-in',
    category: 'technical',
    priority: 'medium',
    status: 'in_progress',
    createdAt: '2024-01-27T14:30:00Z'
  }
];

const mockFinancialData = [
  {
    id: 'fin_001',
    organizerId: 'org_001',
    revenue: 25000,
    currency: 'USD',
    eventsCount: 5,
    averageTicketPrice: 50,
    lastUpdated: '2024-01-28T16:00:00Z'
  },
  {
    id: 'fin_002',
    organizerId: 'org_002',
    revenue: 18000,
    currency: 'GBP',
    eventsCount: 3,
    averageTicketPrice: 60,
    lastUpdated: '2024-01-28T16:00:00Z'
  }
];

// Health endpoints
app.get('/organizer/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      api: 'running',
      cache: 'active'
    }
  });
});

app.get('/organizer/health/database', (req, res) => {
  res.json({
    status: 'healthy',
    database: 'mock-dynamodb',
    tables: ['organizers', 'team', 'marketing', 'support', 'finance'],
    timestamp: new Date().toISOString()
  });
});

app.get('/organizer/health/service', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      organizer: 'active',
      team: 'active',
      marketing: 'active',
      support: 'active',
      finance: 'active'
    },
    timestamp: new Date().toISOString()
  });
});

// Organizer endpoints
app.post('/organizer', (req, res) => {
  const newOrganizer = {
    id: `org_${Date.now()}`,
    ...req.body,
    createdAt: new Date().toISOString(),
    status: 'active'
  };
  mockOrganizers.push(newOrganizer);
  res.status(201).json(newOrganizer);
});

// Team endpoints
app.post('/organizer/team', (req, res) => {
  const newMember = {
    id: `tm_${Date.now()}`,
    ...req.body,
    isActive: true,
    joinedAt: new Date().toISOString()
  };
  mockTeamMembers.push(newMember);
  res.status(201).json(newMember);
});

app.get('/organizer/team', (req, res) => {
  const { organizerId } = req.query;
  let members = mockTeamMembers;
  
  if (organizerId) {
    members = mockTeamMembers.filter(member => member.organizerId === organizerId);
  }
  
  return res.json({
    members,
    totalCount: members.length,
    page: 1,
    pageSize: members.length,
    hasNextPage: false,
    hasPreviousPage: false
  });
});

// Marketing endpoints
app.post('/organizer/marketing', (req, res) => {
  const newCampaign = {
    id: `camp_${Date.now()}`,
    ...req.body,
    status: 'draft',
    createdAt: new Date().toISOString()
  };
  mockCampaigns.push(newCampaign);
  res.status(201).json(newCampaign);
});

app.get('/organizer/marketing', (req, res) => {
  const { organizerId } = req.query;
  let campaigns = mockCampaigns;
  
  if (organizerId) {
    campaigns = mockCampaigns.filter(campaign => campaign.organizerId === organizerId);
  }
  
  return res.json({
    campaigns,
    totalCount: campaigns.length,
    page: 1,
    pageSize: campaigns.length,
    hasNextPage: false,
    hasPreviousPage: false
  });
});

// Support endpoints
app.post('/organizer/support', (req, res) => {
  const newMessage = {
    id: `msg_${Date.now()}`,
    ...req.body,
    status: 'open',
    createdAt: new Date().toISOString()
  };
  mockSupportMessages.push(newMessage);
  res.status(201).json(newMessage);
});

app.get('/organizer/support', (req, res) => {
  const { organizerId } = req.query;
  let messages = mockSupportMessages;
  
  if (organizerId) {
    messages = mockSupportMessages.filter(msg => msg.organizerId === organizerId);
  }
  
  return res.json({
    messages,
    totalCount: messages.length,
    page: 1,
    pageSize: messages.length,
    hasNextPage: false,
    hasPreviousPage: false
  });
});

// Finance endpoints
app.post('/organizer/finance', (req, res) => {
  const newFinancialData = {
    id: `fin_${Date.now()}`,
    ...req.body,
    lastUpdated: new Date().toISOString()
  };
  mockFinancialData.push(newFinancialData);
  res.status(201).json(newFinancialData);
});

app.get('/organizer/finance', (req, res) => {
  const { organizerId } = req.query;
  let financialData = mockFinancialData;
  
  if (organizerId) {
    financialData = mockFinancialData.filter(fin => fin.organizerId === organizerId);
  }
  
  return res.json({
    financialData,
    totalCount: financialData.length,
    page: 1,
    pageSize: financialData.length,
    hasNextPage: false,
    hasPreviousPage: false
  });
});

// More specific routes must come after general routes
app.get('/organizer/marketing/:campaignId/analytics', (req, res) => {
  const campaign = mockCampaigns.find(camp => camp.id === req.params.campaignId);
  if (!campaign) {
    return res.status(404).json({ message: 'Campaign not found' });
  }
  
  const analytics = {
    campaignId: campaign.id,
    impressions: Math.floor(Math.random() * 10000) + 1000,
    clicks: Math.floor(Math.random() * 1000) + 100,
    conversions: Math.floor(Math.random() * 100) + 10,
    spend: campaign.budget.spent,
    ctr: Math.random() * 5 + 1,
    cpc: Math.random() * 2 + 0.5,
    roas: Math.random() * 3 + 1
  };
  
  return res.json(analytics);
});

app.get('/organizer/marketing/:campaignId', (req, res) => {
  const campaign = mockCampaigns.find(camp => camp.id === req.params.campaignId);
  if (!campaign) {
    return res.status(404).json({ message: 'Campaign not found' });
  }
  return res.json(campaign);
});

app.put('/organizer/marketing/:campaignId', (req, res) => {
  const campaignIndex = mockCampaigns.findIndex(camp => camp.id === req.params.campaignId);
  if (campaignIndex === -1) {
    return res.status(404).json({ message: 'Campaign not found' });
  }
  
  mockCampaigns[campaignIndex] = {
    ...mockCampaigns[campaignIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  return res.json(mockCampaigns[campaignIndex]);
});

app.delete('/organizer/marketing/:campaignId', (req, res) => {
  const campaignIndex = mockCampaigns.findIndex(camp => camp.id === req.params.campaignId);
  if (campaignIndex === -1) {
    return res.status(404).json({ message: 'Campaign not found' });
  }
  
  const deletedCampaign = mockCampaigns.splice(campaignIndex, 1)[0];
  return res.json({ message: 'Campaign deleted successfully', campaign: deletedCampaign });
});

app.post('/organizer/marketing/:campaignId/activate', (req, res) => {
  const campaign = mockCampaigns.find(camp => camp.id === req.params.campaignId);
  if (!campaign) {
    return res.status(404).json({ message: 'Campaign not found' });
  }
  
  campaign.status = 'active';
  campaign.updatedAt = new Date().toISOString();
  
  return res.json({ message: 'Campaign activated successfully', campaign });
});

app.post('/organizer/marketing/:campaignId/pause', (req, res) => {
  const campaign = mockCampaigns.find(camp => camp.id === req.params.campaignId);
  if (!campaign) {
    return res.status(404).json({ message: 'Campaign not found' });
  }
  
  campaign.status = 'paused';
  campaign.updatedAt = new Date().toISOString();
  
  return res.json({ message: 'Campaign paused successfully', campaign });
});

// Parameterized routes must come last
app.get('/organizer/:organizerId', (req, res) => {
  const organizer = mockOrganizers.find(org => org.id === req.params.organizerId);
  if (!organizer) {
    return res.status(404).json({ message: 'Organizer not found' });
  }
  return res.json(organizer);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Event Management Platform - Organizer API (Mock Data)',
    version: '1.0.0',
    status: 'running',
    environment: 'development',
    endpoints: {
      health: '/organizer/health',
      organizer: '/organizer',
      team: '/organizer/team',
      marketing: '/organizer/marketing',
      support: '/organizer/support',
      finance: '/organizer/finance'
    },
    note: 'This is a mock API server for development. All data is stored in memory.'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock Organizer API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/organizer/health`);
  console.log(`🏢 API docs: http://localhost:${PORT}/`);
  console.log(`🔗 Frontend can connect to: http://localhost:${PORT}`);
  console.log(`📝 Note: This server uses mock data for development`);
});

export default app;
