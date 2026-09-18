const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const ClientModel = require('../models/Client');

let waClient = null;
let currentQrDataUrl = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'qr_pending' | 'connected' | 'auth_failed'

function normalizePhone(waId) {
  // waId looks like "919876543210@c.us" — strip suffix, keep digits
  return waId.replace('@c.us', '').replace(/\D/g, '');
}

async function findMatchingClient(phone) {
  // Match by last 10 digits, since stored client phones may or may not
  // include country code / formatting.
  const last10 = phone.slice(-10);
  return ClientModel.findOne({ phone: { $regex: `${last10}$` } }).select('_id');
}

function initWhatsApp() {
  if (waClient) return; // already initialized

  waClient = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // use your actual path from `where.exe chrome`
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  waClient.on('qr', async (qr) => {
    connectionStatus = 'qr_pending';
    currentQrDataUrl = await QRCode.toDataURL(qr);
    console.log('📱 WhatsApp QR generated — scan it from the dashboard.');
  });

  waClient.on('ready', () => {
    connectionStatus = 'connected';
    currentQrDataUrl = null;
    console.log('✅ WhatsApp client connected.');
  });

  waClient.on('auth_failure', () => {
    connectionStatus = 'auth_failed';
    console.error('❌ WhatsApp authentication failed.');
  });

  waClient.on('disconnected', (reason) => {
    connectionStatus = 'disconnected';
    console.warn('⚠️  WhatsApp disconnected:', reason);
    waClient = null;
  });

  waClient.on('message', async (msg) => {
    try {
      const phone = normalizePhone(msg.from);
      const matchedClient = await findMatchingClient(phone);
      await WhatsAppMessage.create({
        client: matchedClient?._id || null,
        phone,
        direction: 'incoming',
        body: msg.body,
        waMessageId: msg.id?._serialized,
      });
    } catch (error) {
      console.error('Error saving incoming WhatsApp message:', error.message);
    }
  });

 waClient.initialize().catch((error) => {
  console.error('❌ WhatsApp initialize() failed:', error.message);
  connectionStatus = 'auth_failed';
  waClient = null;
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

  const sent = await waClient.sendMessage(chatId, body);

  const matchedClient = await findMatchingClient(cleanPhone);
  await WhatsAppMessage.create({
    client: matchedClient?._id || null,
    phone: cleanPhone,
    direction: 'outgoing',
    body,
    waMessageId: sent.id?._serialized,
    sentBy: userId,
  });

  return sent;
}

function logout() {
  if (waClient) {
    waClient.logout().catch(() => {});
    waClient = null;
  }
  connectionStatus = 'disconnected';
  currentQrDataUrl = null;
}

module.exports = { initWhatsApp, getStatus, sendMessage, logout };