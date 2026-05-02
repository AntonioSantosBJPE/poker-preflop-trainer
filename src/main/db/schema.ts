import { relations, sql } from 'drizzle-orm'
import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
})

export const situationGroups = sqliteTable(
  'situation_groups',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`)
  },
  (t) => [uniqueIndex('uq_groups_user_name').on(t.userId, t.name)]
)

export const situations = sqliteTable('situations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  groupId: integer('group_id')
    .notNull()
    .references(() => situationGroups.id),
  name: text('name').notNull(),
  position: text('position').notNull(),
  description: text('description'),
  effectiveStack: real('effective_stack').notNull().default(100),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
})

export const actions = sqliteTable('actions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  situationId: integer('situation_id')
    .notNull()
    .references(() => situations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  actionType: text('action_type').notNull(),
  sizeBb: real('size_bb'),
  colorHex: text('color_hex').notNull(),
  sortOrder: integer('sort_order').notNull().default(0)
})

export const rangeCells = sqliteTable('range_cells', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actionId: integer('action_id')
    .notNull()
    .references(() => actions.id, { onDelete: 'cascade' }),
  rowIndex: integer('row_index').notNull(),
  colIndex: integer('col_index').notNull(),
  frequency: real('frequency').notNull().default(1)
})

export const trainingSessions = sqliteTable('training_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  groupId: integer('group_id').references(() => situationGroups.id),
  sessionType: text('session_type'),
  sessionBlockId: text('session_block_id'),
  simultaneousTableCount: integer('simultaneous_table_count'),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  finishedAt: integer('finished_at', { mode: 'timestamp' }),
  totalHands: integer('total_hands').notNull(),
  timerSeconds: integer('timer_seconds').notNull().default(0),
  feedbackMode: text('feedback_mode').notNull(),
  situationIdsJson: text('situation_ids_json').notNull()
})

export const sessionHands = sqliteTable('session_hands', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id')
    .notNull()
    .references(() => trainingSessions.id, { onDelete: 'cascade' }),
  situationId: integer('situation_id')
    .notNull()
    .references(() => situations.id),
  card1Rank: text('card1_rank').notNull(),
  card1Suit: text('card1_suit').notNull(),
  card2Rank: text('card2_rank').notNull(),
  card2Suit: text('card2_suit').notNull(),
  chosenActionId: integer('chosen_action_id').references(() => actions.id),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  responseMs: integer('response_ms').notNull(),
  handIndex: integer('hand_index').notNull()
})

export const usersRelations = relations(users, ({ many }) => ({
  situations: many(situations),
  situationGroups: many(situationGroups),
  trainingSessions: many(trainingSessions)
}))

export const situationGroupsRelations = relations(situationGroups, ({ one, many }) => ({
  situations: many(situations),
  user: one(users, { fields: [situationGroups.userId], references: [users.id] })
}))

export const situationsRelations = relations(situations, ({ one, many }) => ({
  user: one(users, { fields: [situations.userId], references: [users.id] }),
  situationGroup: one(situationGroups, {
    fields: [situations.groupId],
    references: [situationGroups.id]
  }),
  actions: many(actions)
}))

export const actionsRelations = relations(actions, ({ one, many }) => ({
  situation: one(situations, { fields: [actions.situationId], references: [situations.id] }),
  rangeCells: many(rangeCells)
}))

export const rangeCellsRelations = relations(rangeCells, ({ one }) => ({
  action: one(actions, { fields: [rangeCells.actionId], references: [actions.id] })
}))

export const trainingSessionsRelations = relations(trainingSessions, ({ one, many }) => ({
  user: one(users, { fields: [trainingSessions.userId], references: [users.id] }),
  situationGroup: one(situationGroups, {
    fields: [trainingSessions.groupId],
    references: [situationGroups.id]
  }),
  hands: many(sessionHands)
}))

export const sessionHandsRelations = relations(sessionHands, ({ one }) => ({
  session: one(trainingSessions, {
    fields: [sessionHands.sessionId],
    references: [trainingSessions.id]
  }),
  situation: one(situations, {
    fields: [sessionHands.situationId],
    references: [situations.id]
  }),
  chosenAction: one(actions, {
    fields: [sessionHands.chosenActionId],
    references: [actions.id]
  })
}))
