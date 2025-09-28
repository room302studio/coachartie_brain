import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

// Simple logger for brain module
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => console.debug(`[DEBUG] ${message}`, ...args)
};

// Database types
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface BrainDatabase {
  config: ConfigTable;
  logs: LogsTable;
  memories: MemoriesTable;
  messages: MessagesTable;
  prompts: PromptsTable;
  queue: QueueTable;
  todos: TodosTable;
  user_identities: UserIdentitiesTable;
}

export interface ConfigTable {
  id: number;
  config_key: string;
  config_value: string;
  created_at: string;
  history: Json;
  notes: string | null;
}

export interface LogsTable {
  id: number;
  level: string | null;
  message: string | null;
  service: string | null;
  timestamp: string;
}

export interface MemoriesTable {
  id: number;
  conversation_id: string | null;
  created_at: string | null;
  embedding: string | null;
  embedding2: string | null;
  embedding3: string | null;
  key: string | null;
  memory_type: string | null;
  metadata: Json | null;
  related_message_id: number | null;
  resource_id: string | null;
  user_id: string | null;
  value: string | null;
}

export interface MessagesTable {
  id: number;
  channel_id: string | null;
  created_at: string | null;
  email_metadata: Json | null;
  embedding: string | null;
  guild_id: string | null;
  message_type: string | null;
  response_id: number | null;
  user_id: string | null;
  value: string | null;
}

export interface PromptsTable {
  id: number;
  active: boolean | null;
  archived: boolean | null;
  created_at: string;
  history: Json | null;
  notes: string | null;
  prompt_name: string | null;
  prompt_text: string | null;
  type: string | null;
  updated_at: string;
}

export interface QueueTable {
  id: number;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
  created_by: string | null;
  error_message: string | null;
  max_retries: number;
  memorized: boolean | null;
  metadata: Json | null;
  payload: Json;
  priority: number;
  respond_to: Json | null;
  responded: boolean | null;
  retries: number;
  scheduled_for: string | null;
  started_at: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  task_type: string;
  updated_at: string;
}

export interface TodosTable {
  id: number;
  created_at: string;
  data: Json | null;
  description: string | null;
  name: string | null;
}

export interface UserIdentitiesTable {
  id: string;
  created_at: string | null;
  discord_id: string | null;
  display_name: string;
  email: string | null;
  metadata: Json | null;
  phone_number: string | null;
  updated_at: string | null;
}

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export class BrainDatabaseAdapter {
  private database: Database<sqlite3.Database, sqlite3.Statement>;

  constructor(database: Database<sqlite3.Database, sqlite3.Statement>) {
    this.database = database;
  }

  // CONFIG TABLE OPERATIONS
  async getConfig(): Promise<ConfigTable[]> {
    return await this.database.all('SELECT * FROM brain_config ORDER BY config_key');
  }

  async getConfigByKey(key: string): Promise<ConfigTable | undefined> {
    return await this.database.get('SELECT * FROM brain_config WHERE config_key = ?', [key]);
  }

  async insertConfig(config: Omit<ConfigTable, 'id'>): Promise<ConfigTable> {
    const result = await this.database.run(
      `INSERT INTO brain_config (config_key, config_value, created_at, history, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        config.config_key,
        config.config_value,
        config.created_at,
        JSON.stringify(config.history),
        config.notes
      ]
    );
    return { ...config, id: result.lastID! };
  }

  async updateConfig(id: number, config: Partial<ConfigTable>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    if (config.config_key !== undefined) {
      sets.push('config_key = ?');
      values.push(config.config_key);
    }
    if (config.config_value !== undefined) {
      sets.push('config_value = ?');
      values.push(config.config_value);
    }
    if (config.history !== undefined) {
      sets.push('history = ?');
      values.push(JSON.stringify(config.history));
    }
    if (config.notes !== undefined) {
      sets.push('notes = ?');
      values.push(config.notes);
    }

    values.push(id);
    await this.database.run(
      `UPDATE brain_config SET ${sets.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteConfig(id: number): Promise<void> {
    await this.database.run('DELETE FROM brain_config WHERE id = ?', [id]);
  }

  // LOGS TABLE OPERATIONS
  async getLogs(limit?: number, offset?: number, level?: string, service?: string): Promise<LogsTable[]> {
    let query = 'SELECT * FROM brain_logs WHERE 1=1';
    const params: any[] = [];

    if (level) {
      query += ' AND level = ?';
      params.push(level);
    }
    if (service) {
      query += ' AND service = ?';
      params.push(service);
    }

    query += ' ORDER BY timestamp DESC';
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }
    if (offset) {
      query += ' OFFSET ?';
      params.push(offset);
    }

    return await this.database.all(query, params);
  }

  async insertLog(log: Omit<LogsTable, 'id'>): Promise<LogsTable> {
    const result = await this.database.run(
      `INSERT INTO brain_logs (level, message, service, timestamp)
       VALUES (?, ?, ?, ?)`,
      [log.level, log.message, log.service, log.timestamp]
    );
    return { ...log, id: result.lastID! };
  }

  // MEMORIES TABLE OPERATIONS
  async getMemories(userId?: string, limit?: number): Promise<MemoriesTable[]> {
    let query = 'SELECT id, user_id, content, tags, context, timestamp, importance, created_at, updated_at FROM memories WHERE 1=1';
    const params: any[] = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY created_at DESC';
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    return await this.database.all(query, params);
  }

  async searchMemories(query: string, userId?: string, limit?: number): Promise<MemoriesTable[]> {
    let sql = `
      SELECT m.id, m.user_id, m.content as value, m.tags, m.context, m.timestamp, m.importance, m.created_at, m.updated_at FROM memories m
      WHERE m.id IN (
        SELECT rowid FROM memories_fts 
        WHERE memories_fts MATCH ?
      )
    `;
    const params: any[] = [query];

    if (userId) {
      sql += ' AND m.user_id = ?';
      params.push(userId);
    }

    sql += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(limit || 10);

    return await this.database.all(sql, params);
  }

  async insertMemory(memory: Omit<MemoriesTable, 'id'>): Promise<MemoriesTable> {
    const result = await this.database.run(
      `INSERT INTO memories (
        user_id, content, tags, context, timestamp, importance
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        memory.user_id,
        memory.value || '',
        '[]',
        memory.metadata ? JSON.stringify(memory.metadata) : '',
        new Date().toISOString(),
        5
      ]
    );
    return { 
      ...memory, 
      id: result.lastID!,
      content: memory.value,
      value: memory.value 
    };
  }

  async updateMemory(id: number, updates: Partial<Omit<MemoriesTable, 'id'>>): Promise<MemoriesTable> {
    const fields = [];
    const values = [];
    
    // Map content to value and vice versa for compatibility
    if (updates.content !== undefined && updates.value === undefined) {
      updates.value = updates.content;
    }
    if (updates.value !== undefined && updates.content === undefined) {
      updates.content = updates.value;
    }
    
    // Support actual memories table fields
    if (updates.user_id !== undefined) {
      fields.push('user_id = ?');
      values.push(updates.user_id);
    }
    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.value !== undefined) {
      fields.push('content = ?');
      values.push(updates.value);
    }
    if (updates.metadata !== undefined) {
      fields.push('context = ?');
      values.push(JSON.stringify(updates.metadata));
    }
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    await this.database.run(
      `UPDATE memories SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    const result = await this.database.get('SELECT * FROM memories WHERE id = ?', [id]);
    if (!result) {
      throw new Error('Memory not found after update');
    }
    return result as MemoriesTable;
  }

  async deleteMemory(id: number): Promise<void> {
    await this.database.run('DELETE FROM memories WHERE id = ?', [id]);
  }

  // MESSAGES TABLE OPERATIONS
  async getMessages(userId?: string, limit?: number): Promise<MessagesTable[]> {
    let query = 'SELECT * FROM brain_messages WHERE 1=1';
    const params: any[] = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY created_at DESC';
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    return await this.database.all(query, params);
  }

  async insertMessage(message: Omit<MessagesTable, 'id'>): Promise<MessagesTable> {
    const result = await this.database.run(
      `INSERT INTO brain_messages (
        channel_id, created_at, email_metadata, embedding,
        guild_id, message_type, response_id, user_id, value
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.channel_id,
        message.created_at,
        JSON.stringify(message.email_metadata),
        message.embedding,
        message.guild_id,
        message.message_type,
        message.response_id,
        message.user_id,
        message.value
      ]
    );
    return { ...message, id: result.lastID! };
  }

  // PROMPTS TABLE OPERATIONS
  async getPrompts(active?: boolean): Promise<PromptsTable[]> {
    let query = 'SELECT * FROM brain_prompts WHERE 1=1';
    const params: any[] = [];

    if (active !== undefined) {
      query += ' AND active = ?';
      params.push(active ? 1 : 0);
    }

    query += ' ORDER BY prompt_name';
    return await this.database.all(query, params);
  }

  async getPromptByName(name: string): Promise<PromptsTable | undefined> {
    return await this.database.get('SELECT * FROM brain_prompts WHERE prompt_name = ?', [name]);
  }

  async insertPrompt(prompt: Omit<PromptsTable, 'id'>): Promise<PromptsTable> {
    const result = await this.database.run(
      `INSERT INTO brain_prompts (
        active, archived, created_at, history, notes,
        prompt_name, prompt_text, type, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        prompt.active ? 1 : 0,
        prompt.archived ? 1 : 0,
        prompt.created_at,
        JSON.stringify(prompt.history),
        prompt.notes,
        prompt.prompt_name,
        prompt.prompt_text,
        prompt.type,
        prompt.updated_at
      ]
    );
    return { ...prompt, id: result.lastID! };
  }

  async updatePrompt(id: number, prompt: Partial<PromptsTable>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    if (prompt.active !== undefined) {
      sets.push('active = ?');
      values.push(prompt.active ? 1 : 0);
    }
    if (prompt.archived !== undefined) {
      sets.push('archived = ?');
      values.push(prompt.archived ? 1 : 0);
    }
    if (prompt.history !== undefined) {
      sets.push('history = ?');
      values.push(JSON.stringify(prompt.history));
    }
    if (prompt.notes !== undefined) {
      sets.push('notes = ?');
      values.push(prompt.notes);
    }
    if (prompt.prompt_name !== undefined) {
      sets.push('prompt_name = ?');
      values.push(prompt.prompt_name);
    }
    if (prompt.prompt_text !== undefined) {
      sets.push('prompt_text = ?');
      values.push(prompt.prompt_text);
    }
    if (prompt.type !== undefined) {
      sets.push('type = ?');
      values.push(prompt.type);
    }

    sets.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await this.database.run(
      `UPDATE brain_prompts SET ${sets.join(', ')} WHERE id = ?`,
      values
    );
  }

  // QUEUE TABLE OPERATIONS
  async getQueue(status?: string, limit?: number): Promise<QueueTable[]> {
    let query = 'SELECT * FROM brain_queue WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY priority DESC, created_at ASC';
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    return await this.database.all(query, params);
  }

  async insertQueueItem(item: Omit<QueueTable, 'id'>): Promise<QueueTable> {
    const result = await this.database.run(
      `INSERT INTO brain_queue (
        assigned_to, completed_at, created_at, created_by, error_message,
        max_retries, memorized, metadata, payload, priority,
        respond_to, responded, retries, scheduled_for, started_at,
        status, task_type, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.assigned_to,
        item.completed_at,
        item.created_at,
        item.created_by,
        item.error_message,
        item.max_retries,
        item.memorized ? 1 : 0,
        JSON.stringify(item.metadata),
        JSON.stringify(item.payload),
        item.priority,
        JSON.stringify(item.respond_to),
        item.responded ? 1 : 0,
        item.retries,
        item.scheduled_for,
        item.started_at,
        item.status,
        item.task_type,
        item.updated_at
      ]
    );
    return { ...item, id: result.lastID! };
  }

  async updateQueueItem(id: number, item: Partial<QueueTable>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    if (item.status !== undefined) {
      sets.push('status = ?');
      values.push(item.status);
    }
    if (item.started_at !== undefined) {
      sets.push('started_at = ?');
      values.push(item.started_at);
    }
    if (item.completed_at !== undefined) {
      sets.push('completed_at = ?');
      values.push(item.completed_at);
    }
    if (item.error_message !== undefined) {
      sets.push('error_message = ?');
      values.push(item.error_message);
    }
    if (item.retries !== undefined) {
      sets.push('retries = ?');
      values.push(item.retries);
    }

    sets.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await this.database.run(
      `UPDATE brain_queue SET ${sets.join(', ')} WHERE id = ?`,
      values
    );
  }

  // Add alias method for compatibility
  async getQueueItems(status?: string, limit?: number): Promise<QueueTable[]> {
    return this.getQueue(status, limit);
  }

  // TODOS TABLE OPERATIONS
  async getTodos(): Promise<TodosTable[]> {
    return await this.database.all('SELECT * FROM brain_todos ORDER BY created_at DESC');
  }

  async insertTodo(todo: Omit<TodosTable, 'id'>): Promise<TodosTable> {
    const result = await this.database.run(
      `INSERT INTO brain_todos (created_at, data, description, name)
       VALUES (?, ?, ?, ?)`,
      [
        todo.created_at,
        JSON.stringify(todo.data),
        todo.description,
        todo.name
      ]
    );
    return { ...todo, id: result.lastID! };
  }

  async updateTodo(id: number, updates: Partial<Omit<TodosTable, 'id'>>): Promise<TodosTable> {
    const fields = [];
    const values = [];
    
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.data !== undefined) {
      fields.push('data = ?');
      values.push(updates.data);
    }
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    values.push(id);
    
    await this.database.run(
      `UPDATE brain_todos SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    const result = await this.database.get('SELECT * FROM brain_todos WHERE id = ?', [id]);
    if (!result) {
      throw new Error('Todo not found after update');
    }
    return result as TodosTable;
  }

  async deleteTodo(id: number): Promise<void> {
    await this.database.run('DELETE FROM brain_todos WHERE id = ?', [id]);
  }

  // USER IDENTITIES TABLE OPERATIONS
  async getUserIdentities(): Promise<UserIdentitiesTable[]> {
    return await this.database.all('SELECT * FROM brain_user_identities ORDER BY display_name');
  }

  async getUserIdentityById(id: string): Promise<UserIdentitiesTable | undefined> {
    return await this.database.get('SELECT * FROM brain_user_identities WHERE id = ?', [id]);
  }

  async getUserIdentityByDiscordId(discordId: string): Promise<UserIdentitiesTable | undefined> {
    return await this.database.get('SELECT * FROM brain_user_identities WHERE discord_id = ?', [discordId]);
  }

  async insertUserIdentity(user: Omit<UserIdentitiesTable, 'id'> & { id?: string }): Promise<UserIdentitiesTable> {
    const id = user.id || crypto.randomUUID();
    await this.database.run(
      `INSERT INTO brain_user_identities (
        id, created_at, discord_id, display_name, email,
        metadata, phone_number, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user.created_at,
        user.discord_id,
        user.display_name,
        user.email,
        JSON.stringify(user.metadata),
        user.phone_number,
        user.updated_at
      ]
    );
    return { ...user, id };
  }

  async updateUserIdentity(id: string, user: Partial<UserIdentitiesTable>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    if (user.discord_id !== undefined) {
      sets.push('discord_id = ?');
      values.push(user.discord_id);
    }
    if (user.display_name !== undefined) {
      sets.push('display_name = ?');
      values.push(user.display_name);
    }
    if (user.email !== undefined) {
      sets.push('email = ?');
      values.push(user.email);
    }
    if (user.metadata !== undefined) {
      sets.push('metadata = ?');
      values.push(JSON.stringify(user.metadata));
    }
    if (user.phone_number !== undefined) {
      sets.push('phone_number = ?');
      values.push(user.phone_number);
    }

    sets.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await this.database.run(
      `UPDATE brain_user_identities SET ${sets.join(', ')} WHERE id = ?`,
      values
    );
  }
}

export async function getBrainDatabase(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (db) {
    return db;
  }

  try {
    // Use environment variable or fallback to container path
    const dbPath = process.env.DATABASE_PATH || '/app/data/coachartie.db';
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    logger.info(`🧠 Brain database connected: ${dbPath}`);
    
    // Initialize brain-specific database schema
    await initializeBrainDatabase(db);
    
    return db;
  } catch (error) {
    logger.error('❌ Failed to connect to brain database:', error);
    throw error;
  }
}

async function initializeBrainDatabase(database: Database): Promise<void> {
  try {
    await database.exec(`
      -- Config table
      CREATE TABLE IF NOT EXISTS brain_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_key TEXT NOT NULL UNIQUE,
        config_value TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        history TEXT DEFAULT '{}',
        notes TEXT
      );

      -- Logs table
      CREATE TABLE IF NOT EXISTS brain_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT,
        message TEXT,
        service TEXT,
        timestamp TEXT DEFAULT (datetime('now'))
      );

      -- Memories table (compatible with existing structure)
      CREATE TABLE IF NOT EXISTS brain_memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        embedding TEXT,
        embedding2 TEXT,
        embedding3 TEXT,
        key TEXT,
        memory_type TEXT,
        metadata TEXT DEFAULT '{}',
        related_message_id INTEGER,
        resource_id TEXT,
        user_id TEXT,
        value TEXT,
        FOREIGN KEY (related_message_id) REFERENCES brain_messages(id)
      );

      -- Messages table
      CREATE TABLE IF NOT EXISTS brain_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        email_metadata TEXT DEFAULT '{}',
        embedding TEXT,
        guild_id TEXT,
        message_type TEXT,
        response_id INTEGER,
        user_id TEXT,
        value TEXT
      );

      -- Prompts table (separate from existing prompts)
      CREATE TABLE IF NOT EXISTS brain_prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        active INTEGER DEFAULT 1,
        archived INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        history TEXT DEFAULT '{}',
        notes TEXT,
        prompt_name TEXT,
        prompt_text TEXT,
        type TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Queue table
      CREATE TABLE IF NOT EXISTS brain_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assigned_to TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        created_by TEXT,
        error_message TEXT,
        max_retries INTEGER DEFAULT 3,
        memorized INTEGER DEFAULT 0,
        metadata TEXT DEFAULT '{}',
        payload TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        respond_to TEXT DEFAULT '{}',
        responded INTEGER DEFAULT 0,
        retries INTEGER DEFAULT 0,
        scheduled_for TEXT,
        started_at TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
        task_type TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Todos table
      CREATE TABLE IF NOT EXISTS brain_todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT DEFAULT (datetime('now')),
        data TEXT DEFAULT '{}',
        description TEXT,
        name TEXT
      );

      -- User identities table
      CREATE TABLE IF NOT EXISTS brain_user_identities (
        id TEXT PRIMARY KEY,
        created_at TEXT DEFAULT (datetime('now')),
        discord_id TEXT UNIQUE,
        display_name TEXT NOT NULL,
        email TEXT,
        metadata TEXT DEFAULT '{}',
        phone_number TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_brain_config_key ON brain_config(config_key);
      CREATE INDEX IF NOT EXISTS idx_brain_logs_timestamp ON brain_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_brain_logs_service ON brain_logs(service);
      CREATE INDEX IF NOT EXISTS idx_brain_memories_user_id ON brain_memories(user_id);
      CREATE INDEX IF NOT EXISTS idx_brain_memories_created_at ON brain_memories(created_at);
      CREATE INDEX IF NOT EXISTS idx_brain_memories_memory_type ON brain_memories(memory_type);
      CREATE INDEX IF NOT EXISTS idx_brain_messages_user_id ON brain_messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_brain_messages_created_at ON brain_messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_brain_prompts_name ON brain_prompts(prompt_name);
      CREATE INDEX IF NOT EXISTS idx_brain_prompts_active ON brain_prompts(active);
      CREATE INDEX IF NOT EXISTS idx_brain_queue_status ON brain_queue(status);
      CREATE INDEX IF NOT EXISTS idx_brain_queue_priority ON brain_queue(priority);
      CREATE INDEX IF NOT EXISTS idx_brain_queue_created_at ON brain_queue(created_at);
      CREATE INDEX IF NOT EXISTS idx_brain_user_identities_discord_id ON brain_user_identities(discord_id);

      -- FTS5 search for memories
      CREATE VIRTUAL TABLE IF NOT EXISTS brain_memories_fts USING fts5(
        value, key, memory_type, metadata,
        content='brain_memories',
        content_rowid='id'
      );

      -- Triggers to keep FTS in sync
      CREATE TRIGGER IF NOT EXISTS brain_memories_fts_insert AFTER INSERT ON brain_memories BEGIN
        INSERT INTO brain_memories_fts(rowid, value, key, memory_type, metadata) 
        VALUES (new.id, new.value, new.key, new.memory_type, new.metadata);
      END;

      CREATE TRIGGER IF NOT EXISTS brain_memories_fts_delete AFTER DELETE ON brain_memories BEGIN
        INSERT INTO brain_memories_fts(brain_memories_fts, rowid, value, key, memory_type, metadata) 
        VALUES ('delete', old.id, old.value, old.key, old.memory_type, old.metadata);
      END;

      CREATE TRIGGER IF NOT EXISTS brain_memories_fts_update AFTER UPDATE ON brain_memories BEGIN
        INSERT INTO brain_memories_fts(brain_memories_fts, rowid, value, key, memory_type, metadata) 
        VALUES ('delete', old.id, old.value, old.key, old.memory_type, old.metadata);
        INSERT INTO brain_memories_fts(rowid, value, key, memory_type, metadata) 
        VALUES (new.id, new.value, new.key, new.memory_type, new.metadata);
      END;

      -- Update timestamp triggers
      CREATE TRIGGER IF NOT EXISTS brain_prompts_update_timestamp 
        AFTER UPDATE ON brain_prompts
        BEGIN
          UPDATE brain_prompts SET updated_at = datetime('now') WHERE id = NEW.id;
        END;

      CREATE TRIGGER IF NOT EXISTS brain_queue_update_timestamp 
        AFTER UPDATE ON brain_queue
        BEGIN
          UPDATE brain_queue SET updated_at = datetime('now') WHERE id = NEW.id;
        END;

      CREATE TRIGGER IF NOT EXISTS brain_user_identities_update_timestamp 
        AFTER UPDATE ON brain_user_identities
        BEGIN
          UPDATE brain_user_identities SET updated_at = datetime('now') WHERE id = NEW.id;
        END;
    `);
    
    logger.info('✅ Brain database schema initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize brain database schema:', error);
    throw error;
  }
}

export async function getBrainDatabaseAdapter(): Promise<BrainDatabaseAdapter> {
  const database = await getBrainDatabase();
  return new BrainDatabaseAdapter(database);
}

// Export for compatibility with server API endpoints
export const database = getBrainDatabaseAdapter;

export async function closeBrainDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    logger.info('🧠 Brain database connection closed');
  }
}

// Graceful shutdown
process.on('SIGINT', closeBrainDatabase);
process.on('SIGTERM', closeBrainDatabase);