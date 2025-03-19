export const DOCUMENT_SECTIONS = {
  FMS_POLICIES: {
    id: '03ae9ecc-87b5-4245-bdb5-a14aebdb2167',
    name: 'FMS Policies & Procedures',
    description: 'Facility Management System policies and procedures documentation'
  },
  SAFETY: {
    id: 'safety',
    name: 'Safety',
    description: 'Safety guidelines and protocols'
  },
  MAINTENANCE: {
    id: 'maintenance',
    name: 'Maintenance',
    description: 'Maintenance procedures and schedules'
  },
  COMMISSIONING: {
    id: 'commissioning',
    name: 'Commissioning & Testing',
    description: 'System commissioning and testing procedures'
  },
  STANDARDS: {
    id: 'standards',
    name: 'Standards',
    description: 'Industry standards and compliance documents'
  },
  TEMPLATES: {
    id: 'templates',
    name: 'HMG\'s Templates',
    description: 'Standard templates and forms'
  },
  KNOWLEDGE: {
    id: 'knowledge',
    name: 'Knowledge Centre',
    description: 'Educational resources and best practices'
  }
} as const;

export const GOVERNANCE_TABS = [
  {
    id: 'governance',
    name: 'Governance',
    subTabs: [
      { id: DOCUMENT_SECTIONS.FMS_POLICIES.id, name: DOCUMENT_SECTIONS.FMS_POLICIES.name },
      { id: DOCUMENT_SECTIONS.SAFETY.id, name: DOCUMENT_SECTIONS.SAFETY.name },
      { id: DOCUMENT_SECTIONS.MAINTENANCE.id, name: DOCUMENT_SECTIONS.MAINTENANCE.name },
      { id: DOCUMENT_SECTIONS.COMMISSIONING.id, name: DOCUMENT_SECTIONS.COMMISSIONING.name },
      { id: DOCUMENT_SECTIONS.STANDARDS.id, name: DOCUMENT_SECTIONS.STANDARDS.name },
      { id: DOCUMENT_SECTIONS.TEMPLATES.id, name: DOCUMENT_SECTIONS.TEMPLATES.name },
      { id: DOCUMENT_SECTIONS.KNOWLEDGE.id, name: DOCUMENT_SECTIONS.KNOWLEDGE.name }
    ]
  },
  {
    id: 'faq',
    name: 'FAQ'
  },
  {
    id: 'data-analysis',
    name: 'Data Analysis'
  },
  {
    id: 'admin',
    name: 'Admin'
  }
];

export const DEFAULT_SECTION = DOCUMENT_SECTIONS.FMS_POLICIES.id;