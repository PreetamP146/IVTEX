const values = (map) => Object.freeze(Object.values(map));

const ROLES = Object.freeze({
  ADMIN: 'admin',
  SALES_MANAGER: 'sales_manager',
  SALES_EXECUTIVE: 'sales_executive',
});

const LEAD_SOURCES = Object.freeze({
  WEBSITE: 'website',
  REFERRAL: 'referral',
  SOCIAL_MEDIA: 'social_media',
  EMAIL: 'email',
  PHONE: 'phone',
  OTHER: 'other',
});

const LEAD_STATUSES = Object.freeze({
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  UNQUALIFIED: 'unqualified',
  CONVERTED: 'converted',
  LOST: 'lost',
});

const PRIORITIES = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
});

const CUSTOMER_STATUSES = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

const DEAL_STAGES = Object.freeze({
  QUALIFICATION: 'qualification',
  DISCOVERY: 'discovery',
  PROPOSAL: 'proposal',
  NEGOTIATION: 'negotiation',
  WON: 'won',
  LOST: 'lost',
});

const DEAL_STATUSES = Object.freeze({
  OPEN: 'open',
  WON: 'won',
  LOST: 'lost',
});

const ACTIVITY_TYPES = Object.freeze({
  CALL: 'call',
  EMAIL: 'email',
  MEETING: 'meeting',
  DEMO: 'demo',
  FOLLOW_UP: 'follow_up',
  REMINDER: 'reminder',
  NOTE: 'note',
});

const ACTIVITY_STATUSES = Object.freeze({
  PENDING: 'pending',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
});

const ENTITY_TYPES = Object.freeze({
  LEAD: 'lead',
  CUSTOMER: 'customer',
  DEAL: 'deal',
  USER: 'user',
});

const TIMELINE_ACTIONS = Object.freeze({
  LEAD_CREATED: 'lead_created',
  LEAD_ASSIGNED: 'lead_assigned',
  LEAD_REASSIGNED: 'lead_reassigned',
  LEAD_STATUS_CHANGED: 'lead_status_changed',
  LEAD_PRIORITY_CHANGED: 'lead_priority_changed',
  LEAD_CONVERTED: 'lead_converted',
  NOTE_ADDED: 'note_added',
  FOLLOW_UP_CREATED: 'follow_up_created',
  FOLLOW_UP_COMPLETED: 'follow_up_completed',
  ACTIVITY_CREATED: 'activity_created',
  ACTIVITY_COMPLETED: 'activity_completed',
  CUSTOMER_CREATED: 'customer_created',
  CUSTOMER_ASSIGNED: 'customer_assigned',
  DEAL_CREATED: 'deal_created',
  DEAL_STAGE_CHANGED: 'deal_stage_changed',
  DEAL_ASSIGNED: 'deal_assigned',
  DEAL_WON: 'deal_won',
  DEAL_LOST: 'deal_lost',
});

module.exports = {
  ROLES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  PRIORITIES,
  CUSTOMER_STATUSES,
  DEAL_STAGES,
  DEAL_STATUSES,
  ACTIVITY_TYPES,
  ACTIVITY_STATUSES,
  ENTITY_TYPES,
  TIMELINE_ACTIONS,
  ROLE_LIST: values(ROLES),
  LEAD_SOURCE_LIST: values(LEAD_SOURCES),
  LEAD_STATUS_LIST: values(LEAD_STATUSES),
  PRIORITY_LIST: values(PRIORITIES),
  CUSTOMER_STATUS_LIST: values(CUSTOMER_STATUSES),
  DEAL_STAGE_LIST: values(DEAL_STAGES),
  DEAL_STATUS_LIST: values(DEAL_STATUSES),
  ACTIVITY_TYPE_LIST: values(ACTIVITY_TYPES),
  ACTIVITY_STATUS_LIST: values(ACTIVITY_STATUSES),
  ENTITY_TYPE_LIST: values(ENTITY_TYPES),
  TIMELINE_ACTION_LIST: values(TIMELINE_ACTIONS),
};
