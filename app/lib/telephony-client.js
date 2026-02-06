// GentlyOS Telephony Client - Telnyx/Plivo/Bandwidth Integration
// Cheapest Twilio alternatives for SMS, Voice, and Phone Numbers

const https = require('https');
const EventEmitter = require('events');

// Telephony Providers (Cheapest Twilio alternatives)
const TELEPHONY_PROVIDER = {
  TELNYX: 'telnyx',       // ~$0.004/SMS, ~$0.007/min voice
  PLIVO: 'plivo',         // ~$0.005/SMS, ~$0.009/min voice
  BANDWIDTH: 'bandwidth', // ~$0.004/SMS, ~$0.0065/min voice
  VONAGE: 'vonage',       // ~$0.0065/SMS
};

// Message status
const MESSAGE_STATUS = {
  QUEUED: 'queued',
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  UNDELIVERED: 'undelivered',
};

// Call status
const CALL_STATUS = {
  INITIATED: 'initiated',
  RINGING: 'ringing',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  BUSY: 'busy',
  NO_ANSWER: 'no-answer',
  FAILED: 'failed',
  CANCELED: 'canceled',
};

// Number type
const NUMBER_TYPE = {
  LOCAL: 'local',
  TOLL_FREE: 'toll-free',
  MOBILE: 'mobile',
  NATIONAL: 'national',
};

// Number capabilities
const NUMBER_CAPABILITY = {
  SMS: 'sms',
  MMS: 'mms',
  VOICE: 'voice',
  FAX: 'fax',
};

// Message class
class Message {
  constructor(data = {}) {
    this.id = data.id || null;
    this.from = data.from || '';
    this.to = data.to || '';
    this.body = data.body || '';
    this.status = data.status || MESSAGE_STATUS.QUEUED;
    this.direction = data.direction || 'outbound';
    this.provider = data.provider || null;
    this.cost = data.cost || null;
    this.segments = data.segments || 1;
    this.mediaUrls = data.mediaUrls || [];
    this.createdAt = data.createdAt || Date.now();
    this.sentAt = data.sentAt || null;
    this.deliveredAt = data.deliveredAt || null;
    this.errorCode = data.errorCode || null;
    this.errorMessage = data.errorMessage || null;
  }

  toJSON() {
    return {
      id: this.id,
      from: this.from,
      to: this.to,
      body: this.body,
      status: this.status,
      direction: this.direction,
      provider: this.provider,
      cost: this.cost,
      segments: this.segments,
      mediaUrls: this.mediaUrls,
      createdAt: this.createdAt,
      sentAt: this.sentAt,
      deliveredAt: this.deliveredAt,
      errorCode: this.errorCode,
      errorMessage: this.errorMessage,
    };
  }
}

// Call class
class Call {
  constructor(data = {}) {
    this.id = data.id || null;
    this.from = data.from || '';
    this.to = data.to || '';
    this.status = data.status || CALL_STATUS.INITIATED;
    this.direction = data.direction || 'outbound';
    this.provider = data.provider || null;
    this.duration = data.duration || 0;
    this.cost = data.cost || null;
    this.recordingUrl = data.recordingUrl || null;
    this.answeredAt = data.answeredAt || null;
    this.endedAt = data.endedAt || null;
    this.createdAt = data.createdAt || Date.now();
  }

  toJSON() {
    return {
      id: this.id,
      from: this.from,
      to: this.to,
      status: this.status,
      direction: this.direction,
      provider: this.provider,
      duration: this.duration,
      cost: this.cost,
      recordingUrl: this.recordingUrl,
      answeredAt: this.answeredAt,
      endedAt: this.endedAt,
      createdAt: this.createdAt,
    };
  }
}

// Phone Number class
class PhoneNumber {
  constructor(data = {}) {
    this.id = data.id || null;
    this.number = data.number || '';
    this.friendlyName = data.friendlyName || '';
    this.type = data.type || NUMBER_TYPE.LOCAL;
    this.capabilities = data.capabilities || [];
    this.provider = data.provider || null;
    this.country = data.country || 'US';
    this.region = data.region || null;
    this.monthlyCost = data.monthlyCost || null;
    this.purchasedAt = data.purchasedAt || null;
  }

  toJSON() {
    return {
      id: this.id,
      number: this.number,
      friendlyName: this.friendlyName,
      type: this.type,
      capabilities: this.capabilities,
      provider: this.provider,
      country: this.country,
      region: this.region,
      monthlyCost: this.monthlyCost,
      purchasedAt: this.purchasedAt,
    };
  }
}

class TelephonyClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.providers = new Map();
    this.defaultProvider = config.defaultProvider || null;
    this.numbers = new Map();
    this.messages = new Map();
    this.calls = new Map();
    this.initialized = false;

    // Configure Telnyx (recommended - cheapest)
    if (config.telnyx || process.env.TELNYX_API_KEY) {
      this.providers.set(TELEPHONY_PROVIDER.TELNYX, {
        apiKey: config.telnyx?.apiKey || process.env.TELNYX_API_KEY,
        baseUrl: 'https://api.telnyx.com/v2',
      });
      if (!this.defaultProvider) this.defaultProvider = TELEPHONY_PROVIDER.TELNYX;
    }

    // Configure Plivo
    if (config.plivo || process.env.PLIVO_AUTH_ID) {
      this.providers.set(TELEPHONY_PROVIDER.PLIVO, {
        authId: config.plivo?.authId || process.env.PLIVO_AUTH_ID,
        authToken: config.plivo?.authToken || process.env.PLIVO_AUTH_TOKEN,
        baseUrl: 'https://api.plivo.com/v1',
      });
      if (!this.defaultProvider) this.defaultProvider = TELEPHONY_PROVIDER.PLIVO;
    }

    // Configure Bandwidth
    if (config.bandwidth || process.env.BANDWIDTH_API_TOKEN) {
      this.providers.set(TELEPHONY_PROVIDER.BANDWIDTH, {
        accountId: config.bandwidth?.accountId || process.env.BANDWIDTH_ACCOUNT_ID,
        apiToken: config.bandwidth?.apiToken || process.env.BANDWIDTH_API_TOKEN,
        apiSecret: config.bandwidth?.apiSecret || process.env.BANDWIDTH_API_SECRET,
        applicationId: config.bandwidth?.applicationId || process.env.BANDWIDTH_APP_ID,
        baseUrl: 'https://messaging.bandwidth.com/api/v2',
      });
      if (!this.defaultProvider) this.defaultProvider = TELEPHONY_PROVIDER.BANDWIDTH;
    }
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
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  // Initialize
  async initialize() {
    if (this.initialized) return { success: true };

    // Fetch phone numbers from each provider
    for (const provider of this.providers.keys()) {
      try {
        const numbers = await this._fetchNumbers(provider);
        for (const num of numbers) {
          this.numbers.set(num.number, num);
        }
      } catch (error) {
        this.emit('error', { provider, error: error.message });
      }
    }

    this.initialized = true;
    this.emit('initialized', { numberCount: this.numbers.size });
    return { success: true, numberCount: this.numbers.size, providers: Array.from(this.providers.keys()) };
  }

  // =============================================
  // TELNYX API (Cheapest - Recommended)
  // =============================================

  async _telnyxRequest(endpoint, method = 'GET', body = null) {
    const config = this.providers.get(TELEPHONY_PROVIDER.TELNYX);
    if (!config) throw new Error('Telnyx not configured');

    const response = await this._request(
      `${config.baseUrl}${endpoint}`,
      method,
      body,
      { 'Authorization': `Bearer ${config.apiKey}` }
    );

    if (response.status >= 400) {
      throw new Error(response.data?.errors?.[0]?.detail || 'Telnyx API error');
    }

    return response.data;
  }

  async telnyxSendSMS(from, to, body, config = {}) {
    const data = await this._telnyxRequest('/messages', 'POST', {
      from,
      to,
      text: body,
      messaging_profile_id: config.profileId,
      media_urls: config.mediaUrls,
    });

    const msg = new Message({
      id: data.data.id,
      from,
      to,
      body,
      status: MESSAGE_STATUS.QUEUED,
      provider: TELEPHONY_PROVIDER.TELNYX,
      mediaUrls: config.mediaUrls,
    });

    this.messages.set(msg.id, msg);
    this.emit('message:sent', msg.toJSON());
    return msg.toJSON();
  }

  async telnyxMakeCall(from, to, config = {}) {
    const data = await this._telnyxRequest('/calls', 'POST', {
      connection_id: config.connectionId,
      from,
      to,
      answering_machine_detection: config.amd || 'disabled',
      webhook_url: config.webhookUrl,
    });

    const call = new Call({
      id: data.data.call_control_id,
      from,
      to,
      status: CALL_STATUS.INITIATED,
      provider: TELEPHONY_PROVIDER.TELNYX,
    });

    this.calls.set(call.id, call);
    this.emit('call:initiated', call.toJSON());
    return call.toJSON();
  }

  async telnyxListNumbers() {
    const data = await this._telnyxRequest('/phone_numbers?page[size]=250');
    return (data.data || []).map(n => new PhoneNumber({
      id: n.id,
      number: n.phone_number,
      friendlyName: n.connection_name,
      type: n.phone_number_type,
      capabilities: this._parseCapabilities(n),
      provider: TELEPHONY_PROVIDER.TELNYX,
      country: n.address?.country_code,
      monthlyCost: n.monthly_cost?.amount,
    }));
  }

  async telnyxSearchNumbers(country = 'US', config = {}) {
    let endpoint = `/available_phone_numbers?filter[country_code]=${country}`;
    if (config.areaCode) endpoint += `&filter[national_destination_code]=${config.areaCode}`;
    if (config.type) endpoint += `&filter[phone_number_type]=${config.type}`;
    if (config.limit) endpoint += `&filter[limit]=${config.limit}`;

    const data = await this._telnyxRequest(endpoint);
    return (data.data || []).map(n => ({
      number: n.phone_number,
      type: n.phone_number_type,
      region: n.region_information?.[0]?.region_name,
      monthlyCost: n.cost_information?.monthly_cost,
      upfrontCost: n.cost_information?.upfront_cost,
    }));
  }

  async telnyxBuyNumber(phoneNumber, config = {}) {
    const data = await this._telnyxRequest('/number_orders', 'POST', {
      phone_numbers: [{ phone_number: phoneNumber }],
      connection_id: config.connectionId,
      messaging_profile_id: config.profileId,
    });
    return { success: true, orderId: data.data.id };
  }

  // =============================================
  // PLIVO API
  // =============================================

  async _plivoRequest(endpoint, method = 'GET', body = null) {
    const config = this.providers.get(TELEPHONY_PROVIDER.PLIVO);
    if (!config) throw new Error('Plivo not configured');

    const auth = Buffer.from(`${config.authId}:${config.authToken}`).toString('base64');
    const response = await this._request(
      `${config.baseUrl}/Account/${config.authId}${endpoint}`,
      method,
      body,
      { 'Authorization': `Basic ${auth}` }
    );

    if (response.status >= 400) {
      throw new Error(response.data?.error || 'Plivo API error');
    }

    return response.data;
  }

  async plivoSendSMS(from, to, body, config = {}) {
    const data = await this._plivoRequest('/Message/', 'POST', {
      src: from,
      dst: to,
      text: body,
      type: config.type || 'sms',
      url: config.webhookUrl,
    });

    const msg = new Message({
      id: data.message_uuid?.[0],
      from,
      to,
      body,
      status: MESSAGE_STATUS.QUEUED,
      provider: TELEPHONY_PROVIDER.PLIVO,
    });

    this.messages.set(msg.id, msg);
    return msg.toJSON();
  }

  async plivoMakeCall(from, to, answerUrl, config = {}) {
    const data = await this._plivoRequest('/Call/', 'POST', {
      from,
      to,
      answer_url: answerUrl,
      answer_method: 'GET',
      ring_url: config.ringUrl,
      hangup_url: config.hangupUrl,
    });

    const call = new Call({
      id: data.request_uuid,
      from,
      to,
      status: CALL_STATUS.INITIATED,
      provider: TELEPHONY_PROVIDER.PLIVO,
    });

    this.calls.set(call.id, call);
    return call.toJSON();
  }

  async plivoListNumbers() {
    const data = await this._plivoRequest('/Number/');
    return (data.objects || []).map(n => new PhoneNumber({
      number: n.number,
      friendlyName: n.alias,
      type: n.type,
      capabilities: [n.sms_enabled && 'sms', n.voice_enabled && 'voice'].filter(Boolean),
      provider: TELEPHONY_PROVIDER.PLIVO,
      country: n.region?.split(',')[1]?.trim(),
      region: n.region?.split(',')[0],
      monthlyCost: n.monthly_rental_rate,
    }));
  }

  // =============================================
  // BANDWIDTH API
  // =============================================

  async _bandwidthRequest(endpoint, method = 'GET', body = null) {
    const config = this.providers.get(TELEPHONY_PROVIDER.BANDWIDTH);
    if (!config) throw new Error('Bandwidth not configured');

    const auth = Buffer.from(`${config.apiToken}:${config.apiSecret}`).toString('base64');
    const response = await this._request(
      `${config.baseUrl}/users/${config.accountId}${endpoint}`,
      method,
      body,
      { 'Authorization': `Basic ${auth}` }
    );

    if (response.status >= 400) {
      throw new Error(response.data?.description || 'Bandwidth API error');
    }

    return response.data;
  }

  async bandwidthSendSMS(from, to, body, config = {}) {
    const bwConfig = this.providers.get(TELEPHONY_PROVIDER.BANDWIDTH);
    const data = await this._bandwidthRequest('/messages', 'POST', {
      from,
      to: [to],
      text: body,
      applicationId: bwConfig.applicationId,
      media: config.mediaUrls,
    });

    const msg = new Message({
      id: data.id,
      from,
      to,
      body,
      status: MESSAGE_STATUS.QUEUED,
      provider: TELEPHONY_PROVIDER.BANDWIDTH,
      mediaUrls: config.mediaUrls,
    });

    this.messages.set(msg.id, msg);
    return msg.toJSON();
  }

  // =============================================
  // UNIFIED API
  // =============================================

  async _fetchNumbers(provider) {
    switch (provider) {
      case TELEPHONY_PROVIDER.TELNYX:
        return this.telnyxListNumbers();
      case TELEPHONY_PROVIDER.PLIVO:
        return this.plivoListNumbers();
      default:
        return [];
    }
  }

  _parseCapabilities(telnyxNumber) {
    const caps = [];
    if (telnyxNumber.purchased_at) {
      caps.push('sms', 'voice');  // Most Telnyx numbers have both
    }
    return caps;
  }

  // Send SMS (uses default provider)
  async sendSMS(from, to, body, config = {}) {
    const provider = config.provider || this.defaultProvider;

    switch (provider) {
      case TELEPHONY_PROVIDER.TELNYX:
        return this.telnyxSendSMS(from, to, body, config);
      case TELEPHONY_PROVIDER.PLIVO:
        return this.plivoSendSMS(from, to, body, config);
      case TELEPHONY_PROVIDER.BANDWIDTH:
        return this.bandwidthSendSMS(from, to, body, config);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  // Send MMS
  async sendMMS(from, to, body, mediaUrls, config = {}) {
    return this.sendSMS(from, to, body, { ...config, mediaUrls });
  }

  // Make call
  async makeCall(from, to, config = {}) {
    const provider = config.provider || this.defaultProvider;

    switch (provider) {
      case TELEPHONY_PROVIDER.TELNYX:
        return this.telnyxMakeCall(from, to, config);
      case TELEPHONY_PROVIDER.PLIVO:
        return this.plivoMakeCall(from, to, config.answerUrl, config);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  // List phone numbers
  listNumbers() {
    return Array.from(this.numbers.values()).map(n => n.toJSON());
  }

  // Search available numbers
  async searchNumbers(country = 'US', config = {}) {
    const provider = config.provider || this.defaultProvider;

    switch (provider) {
      case TELEPHONY_PROVIDER.TELNYX:
        return this.telnyxSearchNumbers(country, config);
      default:
        throw new Error(`Number search not implemented for: ${provider}`);
    }
  }

  // Buy number
  async buyNumber(phoneNumber, config = {}) {
    const provider = config.provider || this.defaultProvider;

    switch (provider) {
      case TELEPHONY_PROVIDER.TELNYX:
        return this.telnyxBuyNumber(phoneNumber, config);
      default:
        throw new Error(`Number purchase not implemented for: ${provider}`);
    }
  }

  // Get message
  getMessage(messageId) {
    const msg = this.messages.get(messageId);
    if (!msg) throw new Error(`Message not found: ${messageId}`);
    return msg.toJSON();
  }

  // List messages
  listMessages(filter = {}) {
    let messages = Array.from(this.messages.values());

    if (filter.status) {
      messages = messages.filter(m => m.status === filter.status);
    }
    if (filter.direction) {
      messages = messages.filter(m => m.direction === filter.direction);
    }
    if (filter.from) {
      messages = messages.filter(m => m.from === filter.from);
    }
    if (filter.to) {
      messages = messages.filter(m => m.to === filter.to);
    }

    return messages.map(m => m.toJSON());
  }

  // Get call
  getCall(callId) {
    const call = this.calls.get(callId);
    if (!call) throw new Error(`Call not found: ${callId}`);
    return call.toJSON();
  }

  // List calls
  listCalls(filter = {}) {
    let calls = Array.from(this.calls.values());

    if (filter.status) {
      calls = calls.filter(c => c.status === filter.status);
    }
    if (filter.direction) {
      calls = calls.filter(c => c.direction === filter.direction);
    }

    return calls.map(c => c.toJSON());
  }

  // =============================================
  // COST COMPARISON
  // =============================================

  getPricing() {
    return {
      telnyx: {
        sms: { outbound: 0.004, inbound: 0.004 },
        mms: { outbound: 0.01, inbound: 0.01 },
        voice: { outbound: 0.007, inbound: 0.0035 },
        numbers: { local: 1.00, tollFree: 2.00 },
      },
      plivo: {
        sms: { outbound: 0.005, inbound: 0.005 },
        voice: { outbound: 0.009, inbound: 0.0085 },
        numbers: { local: 0.80, tollFree: 2.00 },
      },
      bandwidth: {
        sms: { outbound: 0.004, inbound: 0.004 },
        mms: { outbound: 0.016, inbound: 0.016 },
        voice: { outbound: 0.0065, inbound: 0.0035 },
        numbers: { local: 0.35, tollFree: 1.00 },
      },
      twilio: {  // For comparison
        sms: { outbound: 0.0079, inbound: 0.0079 },
        mms: { outbound: 0.02, inbound: 0.01 },
        voice: { outbound: 0.014, inbound: 0.0085 },
        numbers: { local: 1.15, tollFree: 2.15 },
      },
    };
  }

  // Calculate savings vs Twilio
  calculateSavings(monthlySMS, monthlyMinutes, numberCount = 1) {
    const pricing = this.getPricing();
    const twilioMonthly =
      (monthlySMS * pricing.twilio.sms.outbound) +
      (monthlyMinutes * pricing.twilio.voice.outbound) +
      (numberCount * pricing.twilio.numbers.local);

    const providers = {};
    for (const [name, p] of Object.entries(pricing)) {
      if (name === 'twilio') continue;
      const cost =
        (monthlySMS * p.sms.outbound) +
        (monthlyMinutes * p.voice.outbound) +
        (numberCount * p.numbers.local);
      providers[name] = {
        monthlyCost: cost.toFixed(2),
        savings: (twilioMonthly - cost).toFixed(2),
        savingsPercent: (((twilioMonthly - cost) / twilioMonthly) * 100).toFixed(1),
      };
    }

    return {
      twilioBaseline: twilioMonthly.toFixed(2),
      providers,
      recommendation: Object.entries(providers)
        .sort(([, a], [, b]) => parseFloat(b.savings) - parseFloat(a.savings))[0][0],
    };
  }

  // Get status
  getStatus() {
    return {
      initialized: this.initialized,
      providers: Array.from(this.providers.keys()),
      defaultProvider: this.defaultProvider,
      numberCount: this.numbers.size,
      messageCount: this.messages.size,
      callCount: this.calls.size,
    };
  }

  // Get constants
  getConstants() {
    return {
      TELEPHONY_PROVIDER,
      MESSAGE_STATUS,
      CALL_STATUS,
      NUMBER_TYPE,
      NUMBER_CAPABILITY,
    };
  }
}

module.exports = {
  TelephonyClient,
  Message,
  Call,
  PhoneNumber,
  TELEPHONY_PROVIDER,
  MESSAGE_STATUS,
  CALL_STATUS,
  NUMBER_TYPE,
  NUMBER_CAPABILITY,
};
