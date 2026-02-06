// GentlyOS Gmail Client - Local IMAP/SMTP Email Management
// OAuth2, IMAP sync, SMTP send, label management

const { spawn } = require('child_process');
const EventEmitter = require('events');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { createHash, randomBytes } = require('crypto');

// Email status
const EMAIL_STATUS = {
  UNREAD: 'unread',
  READ: 'read',
  STARRED: 'starred',
  IMPORTANT: 'important',
  DRAFT: 'draft',
  SENT: 'sent',
  TRASH: 'trash',
  SPAM: 'spam',
};

// Gmail labels
const GMAIL_LABEL = {
  INBOX: 'INBOX',
  SENT: '[Gmail]/Sent Mail',
  DRAFTS: '[Gmail]/Drafts',
  TRASH: '[Gmail]/Trash',
  SPAM: '[Gmail]/Spam',
  STARRED: '[Gmail]/Starred',
  IMPORTANT: '[Gmail]/Important',
  ALL: '[Gmail]/All Mail',
};

// Sync state
const SYNC_STATE = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  ERROR: 'error',
  OFFLINE: 'offline',
};

// Email class
class Email {
  constructor(data = {}) {
    this.id = data.id || null;
    this.messageId = data.messageId || null;
    this.threadId = data.threadId || null;
    this.from = data.from || '';
    this.to = data.to || [];
    this.cc = data.cc || [];
    this.bcc = data.bcc || [];
    this.subject = data.subject || '';
    this.body = data.body || '';
    this.bodyHtml = data.bodyHtml || '';
    this.snippet = data.snippet || '';
    this.labels = data.labels || [];
    this.attachments = data.attachments || [];
    this.status = data.status || EMAIL_STATUS.UNREAD;
    this.starred = data.starred || false;
    this.important = data.important || false;
    this.date = data.date || Date.now();
    this.inReplyTo = data.inReplyTo || null;
  }

  toJSON() {
    return {
      id: this.id,
      messageId: this.messageId,
      threadId: this.threadId,
      from: this.from,
      to: this.to,
      cc: this.cc,
      bcc: this.bcc,
      subject: this.subject,
      body: this.body,
      bodyHtml: this.bodyHtml,
      snippet: this.snippet,
      labels: this.labels,
      attachments: this.attachments,
      status: this.status,
      starred: this.starred,
      important: this.important,
      date: this.date,
      inReplyTo: this.inReplyTo,
    };
  }
}

// Attachment class
class Attachment {
  constructor(data = {}) {
    this.id = data.id || null;
    this.filename = data.filename || '';
    this.mimeType = data.mimeType || 'application/octet-stream';
    this.size = data.size || 0;
    this.path = data.path || null;
  }

  toJSON() {
    return {
      id: this.id,
      filename: this.filename,
      mimeType: this.mimeType,
      size: this.size,
      path: this.path,
    };
  }
}

// Account class
class GmailAccount {
  constructor(data = {}) {
    this.email = data.email || '';
    this.name = data.name || '';
    this.accessToken = data.accessToken || null;
    this.refreshToken = data.refreshToken || null;
    this.tokenExpiry = data.tokenExpiry || null;
    this.lastSync = data.lastSync || null;
    this.syncState = data.syncState || SYNC_STATE.IDLE;
  }

  isTokenExpired() {
    if (!this.tokenExpiry) return true;
    return Date.now() >= this.tokenExpiry - 60000;  // 1 minute buffer
  }

  toJSON() {
    return {
      email: this.email,
      name: this.name,
      hasToken: !!this.accessToken,
      lastSync: this.lastSync,
      syncState: this.syncState,
    };
  }
}

class GmailClient extends EventEmitter {
  constructor(config = {}) {
    super();

    // OAuth2 config
    this.clientId = config.clientId || process.env.GMAIL_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.GMAIL_CLIENT_SECRET;
    this.redirectUri = config.redirectUri || 'http://localhost:7337/oauth/callback';

    // Gmail API endpoints
    this.apiUrl = 'https://gmail.googleapis.com/gmail/v1';
    this.authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    this.tokenUrl = 'https://oauth2.googleapis.com/token';

    // IMAP/SMTP config
    this.imapHost = 'imap.gmail.com';
    this.imapPort = 993;
    this.smtpHost = 'smtp.gmail.com';
    this.smtpPort = 465;

    // Local storage
    this.dataDir = config.dataDir || path.join(process.env.HOME || '/home/deck', '.gently', 'gmail');
    this.accounts = new Map();
    this.emails = new Map();
    this.initialized = false;
    this.syncInterval = null;
    this.oauthServer = null;
  }

  // Initialize
  async initialize() {
    if (this.initialized) return { success: true };

    // Create data directory
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Load saved accounts
    await this._loadAccounts();

    this.initialized = true;
    this.emit('initialized', { accountCount: this.accounts.size });
    return { success: true, accountCount: this.accounts.size };
  }

  // Load accounts from disk
  async _loadAccounts() {
    const accountsFile = path.join(this.dataDir, 'accounts.json');
    if (fs.existsSync(accountsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(accountsFile, 'utf-8'));
        for (const acc of data.accounts || []) {
          this.accounts.set(acc.email, new GmailAccount(acc));
        }
      } catch (error) {
        this.emit('error', { message: `Failed to load accounts: ${error.message}` });
      }
    }
  }

  // Save accounts to disk
  async _saveAccounts() {
    const accountsFile = path.join(this.dataDir, 'accounts.json');
    const data = {
      accounts: Array.from(this.accounts.values()).map(a => ({
        email: a.email,
        name: a.name,
        accessToken: a.accessToken,
        refreshToken: a.refreshToken,
        tokenExpiry: a.tokenExpiry,
        lastSync: a.lastSync,
      })),
    };
    fs.writeFileSync(accountsFile, JSON.stringify(data, null, 2));
  }

  // HTTP request helper
  async _request(url, method = 'GET', body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        });
      });

      req.on('error', reject);
      if (body) {
        if (typeof body === 'string') {
          req.write(body);
        } else {
          req.write(JSON.stringify(body));
        }
      }
      req.end();
    });
  }

  // =============================================
  // OAUTH2 AUTHENTICATION
  // =============================================

  // Generate OAuth URL
  getAuthUrl(state = null) {
    if (!this.clientId) {
      throw new Error('Gmail OAuth client ID not configured');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.labels',
        'https://mail.google.com/',  // Full IMAP/SMTP access
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: state || randomBytes(16).toString('hex'),
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  // Exchange code for tokens
  async exchangeCode(code) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Gmail OAuth credentials not configured');
    }

    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
    });

    const response = await this._request(this.tokenUrl, 'POST', body.toString(), {
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    if (response.status !== 200) {
      throw new Error(response.data.error_description || 'Token exchange failed');
    }

    // Get user info
    const userInfo = await this._request(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      'GET',
      null,
      { 'Authorization': `Bearer ${response.data.access_token}` }
    );

    const account = new GmailAccount({
      email: userInfo.data.email,
      name: userInfo.data.name,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      tokenExpiry: Date.now() + (response.data.expires_in * 1000),
    });

    this.accounts.set(account.email, account);
    await this._saveAccounts();

    this.emit('account:added', account.toJSON());
    return account.toJSON();
  }

  // Refresh access token
  async refreshAccessToken(email) {
    const account = this.accounts.get(email);
    if (!account) throw new Error(`Account not found: ${email}`);
    if (!account.refreshToken) throw new Error('No refresh token available');

    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: account.refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await this._request(this.tokenUrl, 'POST', body.toString(), {
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    if (response.status !== 200) {
      throw new Error(response.data.error_description || 'Token refresh failed');
    }

    account.accessToken = response.data.access_token;
    account.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
    await this._saveAccounts();

    return { success: true };
  }

  // Get valid access token (refresh if needed)
  async _getAccessToken(email) {
    const account = this.accounts.get(email);
    if (!account) throw new Error(`Account not found: ${email}`);

    if (account.isTokenExpired()) {
      await this.refreshAccessToken(email);
    }

    return account.accessToken;
  }

  // =============================================
  // GMAIL API
  // =============================================

  // API request with auto-refresh
  async _gmailRequest(email, endpoint, method = 'GET', body = null) {
    const token = await this._getAccessToken(email);
    const url = `${this.apiUrl}/users/me${endpoint}`;

    const response = await this._request(url, method, body, {
      'Authorization': `Bearer ${token}`,
    });

    if (response.status >= 400) {
      throw new Error(response.data.error?.message || 'Gmail API error');
    }

    return response.data;
  }

  // List messages
  async listMessages(email, options = {}) {
    let endpoint = '/messages?maxResults=' + (options.maxResults || 50);

    if (options.labelIds) {
      endpoint += '&labelIds=' + options.labelIds.join('&labelIds=');
    }
    if (options.query) {
      endpoint += '&q=' + encodeURIComponent(options.query);
    }
    if (options.pageToken) {
      endpoint += '&pageToken=' + options.pageToken;
    }

    const data = await this._gmailRequest(email, endpoint);
    return {
      messages: (data.messages || []).map(m => ({ id: m.id, threadId: m.threadId })),
      nextPageToken: data.nextPageToken,
      resultSizeEstimate: data.resultSizeEstimate,
    };
  }

  // Get message details
  async getMessage(email, messageId, format = 'full') {
    const data = await this._gmailRequest(email, `/messages/${messageId}?format=${format}`);
    return this._parseMessage(data);
  }

  // Parse Gmail message to Email object
  _parseMessage(data) {
    const headers = {};
    for (const header of data.payload?.headers || []) {
      headers[header.name.toLowerCase()] = header.value;
    }

    const email = new Email({
      id: data.id,
      messageId: headers['message-id'],
      threadId: data.threadId,
      from: headers.from || '',
      to: (headers.to || '').split(',').map(s => s.trim()).filter(Boolean),
      cc: (headers.cc || '').split(',').map(s => s.trim()).filter(Boolean),
      subject: headers.subject || '(no subject)',
      snippet: data.snippet,
      labels: data.labelIds || [],
      date: headers.date ? new Date(headers.date).getTime() : data.internalDate,
      inReplyTo: headers['in-reply-to'],
    });

    // Parse body
    const parts = data.payload?.parts || [data.payload];
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        email.body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        email.bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.filename && part.body?.attachmentId) {
        email.attachments.push(new Attachment({
          id: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
        }));
      }
    }

    // Set status flags
    if (data.labelIds?.includes('UNREAD')) email.status = EMAIL_STATUS.UNREAD;
    else email.status = EMAIL_STATUS.READ;
    email.starred = data.labelIds?.includes('STARRED') || false;
    email.important = data.labelIds?.includes('IMPORTANT') || false;

    return email;
  }

  // Send email
  async sendEmail(fromEmail, to, subject, body, options = {}) {
    const account = this.accounts.get(fromEmail);
    if (!account) throw new Error(`Account not found: ${fromEmail}`);

    // Build MIME message
    const boundary = `----=_Part_${Date.now()}_${randomBytes(8).toString('hex')}`;
    let message = [
      `From: ${account.name} <${fromEmail}>`,
      `To: ${Array.isArray(to) ? to.join(', ') : to}`,
      options.cc ? `Cc: ${Array.isArray(options.cc) ? options.cc.join(', ') : options.cc}` : null,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      options.inReplyTo ? `In-Reply-To: ${options.inReplyTo}` : null,
      options.inReplyTo ? `References: ${options.inReplyTo}` : null,
    ].filter(Boolean).join('\r\n');

    if (options.attachments?.length) {
      message += `\r\nContent-Type: multipart/mixed; boundary="${boundary}"`;
      message += `\r\n\r\n--${boundary}`;
      message += `\r\nContent-Type: ${options.html ? 'text/html' : 'text/plain'}; charset=UTF-8`;
      message += `\r\n\r\n${body}`;

      for (const att of options.attachments) {
        if (fs.existsSync(att.path)) {
          const content = fs.readFileSync(att.path).toString('base64');
          message += `\r\n--${boundary}`;
          message += `\r\nContent-Type: ${att.mimeType || 'application/octet-stream'}`;
          message += `\r\nContent-Disposition: attachment; filename="${att.filename || path.basename(att.path)}"`;
          message += `\r\nContent-Transfer-Encoding: base64`;
          message += `\r\n\r\n${content}`;
        }
      }
      message += `\r\n--${boundary}--`;
    } else {
      message += `\r\nContent-Type: ${options.html ? 'text/html' : 'text/plain'}; charset=UTF-8`;
      message += `\r\n\r\n${body}`;
    }

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const data = await this._gmailRequest(fromEmail, '/messages/send', 'POST', {
      raw: encodedMessage,
      threadId: options.threadId,
    });

    this.emit('email:sent', { id: data.id, to, subject });
    return { success: true, id: data.id, threadId: data.threadId };
  }

  // Reply to email
  async replyEmail(fromEmail, originalMessageId, body, options = {}) {
    const original = await this.getMessage(fromEmail, originalMessageId);

    return this.sendEmail(
      fromEmail,
      original.from,
      original.subject.startsWith('Re:') ? original.subject : `Re: ${original.subject}`,
      body,
      {
        ...options,
        inReplyTo: original.messageId,
        threadId: original.threadId,
      }
    );
  }

  // Forward email
  async forwardEmail(fromEmail, originalMessageId, to, body = '', options = {}) {
    const original = await this.getMessage(fromEmail, originalMessageId);

    const forwardBody = `${body}\n\n---------- Forwarded message ----------\n` +
      `From: ${original.from}\n` +
      `Date: ${new Date(original.date).toISOString()}\n` +
      `Subject: ${original.subject}\n` +
      `To: ${original.to.join(', ')}\n\n` +
      original.body;

    return this.sendEmail(
      fromEmail,
      to,
      original.subject.startsWith('Fwd:') ? original.subject : `Fwd: ${original.subject}`,
      forwardBody,
      options
    );
  }

  // Modify labels
  async modifyLabels(email, messageId, addLabels = [], removeLabels = []) {
    return this._gmailRequest(email, `/messages/${messageId}/modify`, 'POST', {
      addLabelIds: addLabels,
      removeLabelIds: removeLabels,
    });
  }

  // Mark as read
  async markAsRead(email, messageId) {
    return this.modifyLabels(email, messageId, [], ['UNREAD']);
  }

  // Mark as unread
  async markAsUnread(email, messageId) {
    return this.modifyLabels(email, messageId, ['UNREAD'], []);
  }

  // Star message
  async starMessage(email, messageId, starred = true) {
    if (starred) {
      return this.modifyLabels(email, messageId, ['STARRED'], []);
    } else {
      return this.modifyLabels(email, messageId, [], ['STARRED']);
    }
  }

  // Move to trash
  async trashMessage(email, messageId) {
    return this._gmailRequest(email, `/messages/${messageId}/trash`, 'POST');
  }

  // Permanently delete
  async deleteMessage(email, messageId) {
    return this._gmailRequest(email, `/messages/${messageId}`, 'DELETE');
  }

  // Archive (remove from INBOX)
  async archiveMessage(email, messageId) {
    return this.modifyLabels(email, messageId, [], ['INBOX']);
  }

  // =============================================
  // LABELS
  // =============================================

  // List labels
  async listLabels(email) {
    const data = await this._gmailRequest(email, '/labels');
    return (data.labels || []).map(l => ({
      id: l.id,
      name: l.name,
      type: l.type,
      messageCount: l.messagesTotal,
      unreadCount: l.messagesUnread,
    }));
  }

  // Create label
  async createLabel(email, name, config = {}) {
    return this._gmailRequest(email, '/labels', 'POST', {
      name,
      labelListVisibility: config.visible !== false ? 'labelShow' : 'labelHide',
      messageListVisibility: config.showInList !== false ? 'show' : 'hide',
    });
  }

  // Delete label
  async deleteLabel(email, labelId) {
    return this._gmailRequest(email, `/labels/${labelId}`, 'DELETE');
  }

  // =============================================
  // THREADS
  // =============================================

  // List threads
  async listThreads(email, options = {}) {
    let endpoint = '/threads?maxResults=' + (options.maxResults || 50);

    if (options.labelIds) {
      endpoint += '&labelIds=' + options.labelIds.join('&labelIds=');
    }
    if (options.query) {
      endpoint += '&q=' + encodeURIComponent(options.query);
    }

    const data = await this._gmailRequest(email, endpoint);
    return {
      threads: data.threads || [],
      nextPageToken: data.nextPageToken,
    };
  }

  // Get thread
  async getThread(email, threadId) {
    const data = await this._gmailRequest(email, `/threads/${threadId}`);
    return {
      id: data.id,
      snippet: data.snippet,
      messages: (data.messages || []).map(m => this._parseMessage(m)),
    };
  }

  // =============================================
  // SEARCH
  // =============================================

  // Search emails with Gmail query syntax
  async search(email, query, options = {}) {
    return this.listMessages(email, { ...options, query });
  }

  // Common search helpers
  async getUnread(email, options = {}) {
    return this.search(email, 'is:unread', options);
  }

  async getStarred(email, options = {}) {
    return this.search(email, 'is:starred', options);
  }

  async getImportant(email, options = {}) {
    return this.search(email, 'is:important', options);
  }

  async getFromSender(email, sender, options = {}) {
    return this.search(email, `from:${sender}`, options);
  }

  async getWithAttachment(email, options = {}) {
    return this.search(email, 'has:attachment', options);
  }

  async getByDate(email, after, before, options = {}) {
    let query = '';
    if (after) query += `after:${after} `;
    if (before) query += `before:${before}`;
    return this.search(email, query.trim(), options);
  }

  // =============================================
  // SYNC
  // =============================================

  // Sync inbox
  async syncInbox(email, options = {}) {
    const account = this.accounts.get(email);
    if (!account) throw new Error(`Account not found: ${email}`);

    account.syncState = SYNC_STATE.SYNCING;
    this.emit('sync:start', { email });

    try {
      const messages = await this.listMessages(email, {
        maxResults: options.maxResults || 100,
        labelIds: ['INBOX'],
      });

      const emailDir = path.join(this.dataDir, email.replace('@', '_at_'));
      if (!fs.existsSync(emailDir)) {
        fs.mkdirSync(emailDir, { recursive: true });
      }

      const synced = [];
      for (const msg of messages.messages) {
        const fullMsg = await this.getMessage(email, msg.id);
        this.emails.set(`${email}:${msg.id}`, fullMsg);

        // Save to disk
        const msgFile = path.join(emailDir, `${msg.id}.json`);
        fs.writeFileSync(msgFile, JSON.stringify(fullMsg.toJSON(), null, 2));
        synced.push(msg.id);
      }

      account.syncState = SYNC_STATE.IDLE;
      account.lastSync = Date.now();
      await this._saveAccounts();

      this.emit('sync:complete', { email, count: synced.length });
      return { success: true, synced: synced.length };
    } catch (error) {
      account.syncState = SYNC_STATE.ERROR;
      this.emit('sync:error', { email, error: error.message });
      throw error;
    }
  }

  // Start auto-sync
  startAutoSync(intervalMs = 300000) {  // 5 minutes default
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      for (const email of this.accounts.keys()) {
        try {
          await this.syncInbox(email);
        } catch (error) {
          this.emit('error', { email, error: error.message });
        }
      }
    }, intervalMs);

    return { success: true, interval: intervalMs };
  }

  // Stop auto-sync
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    return { success: true };
  }

  // =============================================
  // ACCOUNT MANAGEMENT
  // =============================================

  // List accounts
  listAccounts() {
    return Array.from(this.accounts.values()).map(a => a.toJSON());
  }

  // Get account
  getAccount(email) {
    const account = this.accounts.get(email);
    if (!account) throw new Error(`Account not found: ${email}`);
    return account.toJSON();
  }

  // Remove account
  async removeAccount(email) {
    this.accounts.delete(email);
    await this._saveAccounts();

    // Remove cached emails
    for (const key of this.emails.keys()) {
      if (key.startsWith(`${email}:`)) {
        this.emails.delete(key);
      }
    }

    this.emit('account:removed', { email });
    return { success: true };
  }

  // Get profile info
  async getProfile(email) {
    const data = await this._gmailRequest(email, '/profile');
    return {
      email: data.emailAddress,
      messagesTotal: data.messagesTotal,
      threadsTotal: data.threadsTotal,
      historyId: data.historyId,
    };
  }

  // =============================================
  // STATUS
  // =============================================

  getStatus() {
    return {
      initialized: this.initialized,
      hasOAuthConfig: !!(this.clientId && this.clientSecret),
      accountCount: this.accounts.size,
      cachedEmailCount: this.emails.size,
      autoSyncEnabled: !!this.syncInterval,
    };
  }

  getConstants() {
    return {
      EMAIL_STATUS,
      GMAIL_LABEL,
      SYNC_STATE,
    };
  }

  // Cleanup
  async cleanup() {
    this.stopAutoSync();
    if (this.oauthServer) {
      this.oauthServer.close();
    }
  }
}

module.exports = {
  GmailClient,
  Email,
  Attachment,
  GmailAccount,
  EMAIL_STATUS,
  GMAIL_LABEL,
  SYNC_STATE,
};
