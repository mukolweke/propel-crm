import bcrypt from 'bcryptjs'
import type { Types } from 'mongoose'
import { connectDatabase, disconnectDatabase } from '../src/config/database.js'
import {
  User,
  Contact,
  Interaction,
  FollowUp,
  SharedAccess,
  ReportSnapshot,
} from '../src/models/index.js'
import { logger } from '../src/utils/logger.js'
import { startOfDay } from '../src/utils/helpers.js'

const DEMO_PASSWORD = 'password123'

const AGENTS = [
  { fullName: 'Alex Morgan', email: 'alex@propel.re', role: 'agent' as const },
  { fullName: 'Sarah Jenkins', email: 'sarah@propel.re', role: 'agent' as const },
  { fullName: 'Michael Thorne', email: 'michael@propel.re', role: 'agent' as const },
  { fullName: 'Nathan Hall', email: 'nathan@propel.re', role: 'agent' as const },
  { fullName: 'Riley Chen', email: 'riley@propel.re', role: 'manager' as const },
]

const PROPERTY_TYPES = [
  'Single Family Home',
  'Apartment',
  'Townhouse',
  'Condominium',
  'Commercial',
  'Estate / Luxury',
  'Land',
]

const BUDGET_RANGES = ['Under $500k', '$500k - $750k', '$750k - $1M', '$1M - $2M', 'Over $2M']
const LEAD_SOURCES = ['Zillow', 'Referral', 'Open House', 'Website', 'Social Media', 'Cold Call']
const STATUSES = ['new', 'contacted', 'interested', 'follow_up', 'converted', 'lost'] as const
const INTERACTION_TYPES = [
  'call',
  'whatsapp',
  'sms',
  'meeting',
  'property_viewing',
  'physical_visit',
] as const

const FIRST_NAMES = [
  'James', 'Emma', 'Ryan', 'Olivia', 'David', 'Sophia', 'Chris', 'Ava', 'Daniel', 'Mia',
  'Jonathan', 'Mina', 'Arthur', 'Lucy', 'Robert', 'Elena', 'Marcus', 'Priya', 'Kevin', 'Nina',
]
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Taylor',
  'Harker', 'Murray', 'Holmwood', 'Westenra', 'Morris', 'Patel', 'Nguyen', 'Brooks', 'Cole', 'Reed',
]

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

async function seed() {
  await connectDatabase()
  logger.info('Clearing existing data...')
  await Promise.all([
    User.deleteMany({}),
    Contact.deleteMany({}),
    Interaction.deleteMany({}),
    FollowUp.deleteMany({}),
    SharedAccess.deleteMany({}),
    ReportSnapshot.deleteMany({}),
  ])

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const users = await User.insertMany(
    AGENTS.map((a) => ({
      ...a,
      password: passwordHash,
      notificationSettings: {
        emailAlerts: true,
        followUpReminders: true,
        weeklyDigest: false,
        sharedListUpdates: true,
      },
    })),
  )

  logger.info(`Created ${users.length} demo users`)

  const contactsPerAgent = 10
  const allContacts: Array<{
    ownerId: Types.ObjectId
    sharedWith: Types.ObjectId[]
    fullName: string
    phone: string
    email: string
    propertyInterest: string
    budgetRange: string
    preferredLocation: string
    leadSource: string
    notes: string
    status: (typeof STATUSES)[number]
    lastInteractionDate?: Date
    nextFollowUpDate?: Date
    isConverted: boolean
    createdAt: Date
    updatedAt: Date
  }> = []

  for (const agent of users.filter((u) => u.role === 'agent')) {
    for (let i = 0; i < contactsPerAgent; i++) {
      const status = randomItem(STATUSES)
      const createdAt = daysAgo(Math.floor(Math.random() * 60))
      allContacts.push({
        ownerId: agent._id,
        sharedWith: [],
        fullName: `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
        phone: `+1-555-${String(1000 + Math.floor(Math.random() * 9000))}`,
        email: `lead${i}@example.com`,
        propertyInterest: randomItem(PROPERTY_TYPES),
        budgetRange: randomItem(BUDGET_RANGES),
        preferredLocation: randomItem(['Downtown', 'Suburbs', 'Waterfront', 'Historic District']),
        leadSource: randomItem(LEAD_SOURCES),
        notes: 'Demo contact generated for portfolio presentation.',
        status,
        lastInteractionDate: Math.random() > 0.3 ? daysAgo(Math.floor(Math.random() * 14)) : undefined,
        nextFollowUpDate: Math.random() > 0.5 ? daysFromNow(Math.floor(Math.random() * 14)) : undefined,
        isConverted: status === 'converted',
        createdAt,
        updatedAt: createdAt,
      })
    }
  }

  const contacts = await Contact.insertMany(allContacts)
  logger.info(`Created ${contacts.length} contacts`)

  const interactions: Array<{
    contactId: Types.ObjectId
    ownerId: Types.ObjectId
    interactionType: (typeof INTERACTION_TYPES)[number]
    notes: string
    outcome: string
    nextFollowUpDate?: Date
    createdAt: Date
    updatedAt: Date
  }> = []
  const followUps: Array<{
    ownerId: Types.ObjectId
    contactId: Types.ObjectId
    scheduledDate: Date
    status: 'pending' | 'overdue'
    notes: string
  }> = []

  for (const contact of contacts) {
    const count = 1 + Math.floor(Math.random() * 4)
    for (let i = 0; i < count; i++) {
      const createdAt = daysAgo(Math.floor(Math.random() * 30))
      interactions.push({
        contactId: contact._id,
        ownerId: contact.ownerId,
        interactionType: randomItem(INTERACTION_TYPES),
        notes: 'Discussed property options and next steps.',
        outcome: randomItem(['Positive', 'Neutral', 'Needs follow-up', 'Scheduled viewing']),
        nextFollowUpDate: Math.random() > 0.6 ? daysFromNow(3) : undefined,
        createdAt,
        updatedAt: createdAt,
      })
    }

    if (contact.nextFollowUpDate) {
      followUps.push({
        ownerId: contact.ownerId,
        contactId: contact._id,
        scheduledDate: contact.nextFollowUpDate,
        status: contact.nextFollowUpDate < new Date() ? 'overdue' : 'pending',
        notes: 'Follow up on property interest',
      })
    }
  }

  await Interaction.insertMany(interactions)
  await FollowUp.insertMany(followUps)
  logger.info(`Created ${interactions.length} interactions and ${followUps.length} follow-ups`)

  const agent1 = users[0]!
  const agent2 = users[1]!
  const sharedContact = contacts.find((c) => c.ownerId.equals(agent1._id))
  if (sharedContact) {
    await SharedAccess.create({
      contactId: sharedContact._id,
      ownerId: agent1._id,
      sharedUserId: agent2._id,
      permission: 'view',
    })
    sharedContact.sharedWith = [...sharedContact.sharedWith, agent2._id]
    await sharedContact.save()
    logger.info('Created demo shared contact between agents')
  }

  const today = startOfDay(new Date())
  for (const agent of users.filter((u) => u.role === 'agent')) {
    await ReportSnapshot.create({
      ownerId: agent._id,
      date: today,
      interactionsCount: Math.floor(Math.random() * 8) + 1,
      contactsAdded: Math.floor(Math.random() * 3),
      convertedClients: Math.floor(Math.random() * 2),
      followUpsCompleted: Math.floor(Math.random() * 4),
    })
  }

  logger.info('Seed complete!')
  logger.info('Demo login: alex@propel.re / password123')
  await disconnectDatabase()
}

seed().catch((err) => {
  logger.error('Seed failed', err)
  process.exit(1)
})
