const { Lead, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const LeadModel = require('../models/Lead');

let walead = null;
let currentQrDataUrl = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'qr_pending' | 'connected' | 'auth_failed'

function normalizePhone(waId) {
  // waId looks like "919876543210@c.us" — strip suffix, keep digits
  return waId.replace('@c.us', '').replace(/\D/g, '');
}

async function findMatchingLead(phone) {
  // Match by last 10 digits, since stored leadphones may or may not
  // include country code / formatting.
  const last10 = phone.slice(-10);
  return LeadModel.findOne({ phone: { $regex: `${last10}$` } }).select('_id');
}

function initWhatsApp() {
  if (waLead) return; // already initialized

  walead = new Lead({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      executablePath: process.env.WHATSAPP_CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  waLead.on('qr', async (qr) => {
    connectionStatus = 'qr_pending';
    currentQrDataUrl = await QRCode.toDataURL(qr);
    console.log('📱 WhatsApp QR generated — scan it from the dashboard.');
  });

  waLead.on('ready', () => {
    connectionStatus = 'connected';
    currentQrDataUrl = null;
    console.log('✅ WhatsApp leadconnected.');
  });

  waLead.on('auth_failure', () => {
    connectionStatus = 'auth_failed';
    console.error('❌ WhatsApp authentication failed.');
  });

  waLead.on('disconnected', (reason) => {
    connectionStatus = 'disconnected';
    console.warn('⚠️  WhatsApp disconnected:', reason);
    walead = null;
  });

  waLead.on('message', async (msg) => {
    try {
      const phone = normalizePhone(msg.from);
      const matchedlead = await findMatchingLead(phone);
      await WhatsAppMessage.create({
        Lead: matchedLead?._id || null,
        phone,
        direction: 'incoming',
        body: msg.body,
        waMessageId: msg.id?._serialized,
      });
    } catch (error) {
      console.error('Error saving incoming WhatsApp message:', error.message);
    }
  });

  waLead.initialize().catch((error) => {
    console.error('❌ WhatsApp initialize() failed:', error.message);
    connectionStatus = 'auth_failed';
    walead = null;
  });
}

function getStatus() {
  return { status: connectionStatus, qr: currentQrDataUrl };
}

async function sendMessage(phone, body, userId) {
  if (connectionStatus !== 'connected') {
    throw new Error('WhatsApp is not connected. Please scan the QR code first.');
  }
  const cleanPhone = phone.replace(/\D/g, '');
  const chatId = `${cleanPhone}@c.us`;

  const sent = await waLead.sendMessage(chatId, body);

  const matchedlead = await findMatchingLead(cleanPhone);
  await WhatsAppMessage.create({
    Lead: matchedLead?._id || null,
    phone: cleanPhone,
    direction: 'outgoing',
    body,
    waMessageId: sent.id?._serialized,
    sentBy: userId,
  });

  return sent;
}

function logout() {
  if (waLead) {
    waLead.logout().catch(() => { });
    walead = null;
  }
  connectionStatus = 'disconnected';
  currentQrDataUrl = null;
}

module.exports = { initWhatsApp, getStatus, sendMessage, logout };