const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const User = require('../models/User');
const LeadStageHistory = require('../models/LeadStageHistory');
const Remark = require('../models/Remark');
const { sendLeadStageNotificationEmail } = require('./notificationService');

/**
 * Formats any phone number into international E.164 format (e.g. +919169137366)
 */
const formatE164Phone = (raw) => {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91${digits.slice(1)}`;
  }
  if (String(raw).trim().startsWith('+')) {
    return `+${digits}`;
  }
  return `+91${digits}`;
};

/**
 * Triggers an outbound cellular phone call to a lead via Vapi.ai API
 * Supports Hindi (हिंदी) and Indian English (en-IN)
 */
const triggerVapiOutboundCall = async (leadId, requestingUser, options = {}) => {
  const apiKey = process.env.VAPI_API_KEY;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

  if (!apiKey) {
    throw new Error('VAPI_API_KEY is not configured in server/.env. Please add your Vapi API key.');
  }

  let lead = null;
  if (mongoose.Types.ObjectId.isValid(leadId)) {
    lead = await Lead.findById(leadId);
  } else {
    lead = await Lead.findOne({ $or: [{ phone: leadId }, { name: leadId }, { LeadId: leadId }] });
  }

  // Fallback to sample/options lead if not yet stored in DB
  if (!lead) {
    const rawPhone = options.phone || options.overridePhone || '9169137366';
    const LeadId = await Lead.generateLeadId();
    lead = await Lead.create({
      LeadId,
      name: options.name || 'Amit yadav',
      phone: rawPhone.replace(/\D/g, '').slice(-10) || '9169137366',
      company: options.company || 'Green Valley Residences 3BHK',
      email: options.email || 'customer@example.com',
      address: { street: 'Sector 150 Expressway', city: 'Noida', state: 'UP' },
      projectValue: options.projectValue || 5500000,
      pipelineStage: 'NEW',
      createdBy: requestingUser?._id,
      assignedTo: requestingUser?._id,
    });
  }

  const rawPhone = options.overridePhone || lead.phone;
  const cleanPhone = formatE164Phone(rawPhone);

  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error(`Invalid phone number for ${lead.name}: "${rawPhone}". Must be a valid 10-digit number.`);
  }

  const language = (options.language || 'hi').toLowerCase(); // 'hi' or 'en-in'
  const isHindi = language === 'hi' || language === 'hindi';

  const budget = lead.projectValue ? `₹${Number(lead.projectValue).toLocaleString('en-IN')}` : '₹45-65 Lakhs';
  const city = lead.address?.city || lead.address?.street || 'Noida';
  const project = lead.company || 'Green Valley Luxury Residences';

  // System Prompts for Indian English and Hindi
  const promptHindi = `आप अपेक्स कंस्ट्रक्शन CRM (Apex Construction) के लिए एक अत्यंत विनम्र, पेशेवर और स्मार्ट टेलीकॉलर "सोफिया" हैं।
आप संभावित ग्राहक "${lead.name}" को कॉल कर रही हैं।

ग्राहक जानकारी:
- ग्राहक का नाम: ${lead.name}
- प्रोजेक्ट में रुचि: ${project}
- अनुमानित बजट: ${budget}
- लोकेशन: ${city}

आपके मुख्य उद्देश्य:
1. ग्राहक का गर्मजोशी से हिंदी में स्वागत करें: "नमस्ते ${lead.name} जी, मैं अपेक्स कंस्ट्रक्शन से सोफिया बोल रही हूँ।"
2. प्रोजेक्ट की खूबियां बताएं: 100% RERA अप्रूव्ड, टाटा टिस्कॉन 550D स्टील और अल्ट्राटेक सीमेंट से ग्रेड-ए निर्माण, 5 साल की गारंटी, और SBI व HDFC से स्वीकृत 20:80 आसान निर्माण-लिंक्ड बैंक किस्तें।
3. यदि ग्राहक बजट या डिस्काउंट की बात करे: प्री-लॉन्च विशेष बुकिंग डिस्काउंट और ज़ीरो स्टैम्प ड्यूटी का लाभ बताएं।
4. मुख्य लक्ष्य (Closing): ग्राहक को इस आने वाले वीकेंड (शनिवार या रविवार सुबह 11:00 बजे) फ्री वीआईपी ऑन-साइट विजिट (Site Visit) के लिए राजी करें। बताएं कि साइट पर हमारे सीनियर इंजीनियर सैंपल फ्लैट दिखाएंगे और घर से पिकअप-ड्रॉप सुविधा बिल्कुल मुफ्त रहेगी।
5. जैसे ही ग्राहक साइट विजिट के लिए 'हाँ' कहे, खुशी से पुष्टि करें और कहें: "बहुत-बहुत धन्यवाद ${lead.name} जी! आपकी साइट विजिट कन्फर्म हो गई है। हमारे टीम मैनेजर तुरंत आपके लिए एक सीनियर फील्ड सेल्स एग्जीक्यूटिव को असाइन कर रहे हैं।"
पूरी बातचीत सहज, विनम्र और स्वाभाविक हिंदी (Hindi / Hinglish) में करें। वाक्य छोटे और स्पष्ट रखें।`;

  const promptEnglish = `You are Sophia, an expert construction and real estate telecaller for Apex Construction CRM.
You are calling a potential homebuyer named "${lead.name}".

Lead Credentials:
- Name: ${lead.name}
- Project Interest: ${project}
- Target Budget: ${budget}
- Location: ${city}

Your Objectives:
1. Greet warmly in natural Indian English: "Hello ${lead.name}, good day! This is Sophia from Apex Construction."
2. Pitch the project's USPs: 100% RERA approval, Grade-A construction (Tata Tiscon steel, UltraTech cement), 5-year structural warranty, and flexible 20:80 bank-approved payment plans (SBI, HDFC).
3. If they have budget concerns: explain pre-launch spot booking discounts and zero stamp duty waiver within their budget of ${budget}.
4. Primary Goal: Convince the lead to confirm a VIP on-site visit for this upcoming weekend (Saturday or Sunday at 11:00 AM) with complimentary doorstep pickup.
5. Once they agree, thank them enthusiastically and state that our Team Manager will immediately assign a Senior Field Sales Executive to assist them.
Keep your responses conversational, concise (2-3 sentences), and focused on confirming the site visit.`;

  const firstMessage = isHindi
    ? `नमस्ते ${lead.name} जी, मैं अपेक्स कंस्ट्रक्शन से सोफिया बोल रही हूँ। मैं हमारे ${project} प्रोजेक्ट के बारे में आपसे बात करने के लिए कॉल कर रही हूँ। क्या आपके पास 2 मिनट का समय है?`
    : `Hello ${lead.name}, good day! This is Sophia calling from Apex Construction. I am following up on your inquiry for our ${project} development in ${city}. Do you have two minutes to discuss your requirements?`;

  const requestBody = {
    phoneNumberId: phoneNumberId || undefined,
    customer: {
      number: cleanPhone,
      name: lead.name,
    },
    assistant: {
      firstMessage,
      model: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: isHindi ? promptHindi : promptEnglish,
          },
        ],
      },
      voice: {
        provider: '11labs',
        voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel / Multilingual
        model: 'eleven_multilingual_v2',
      },
      endCallMessage: isHindi
        ? 'धन्यवाद! आपकी साइट विजिट कन्फर्म हो गई है। हमारी टीम जल्द ही आपसे संपर्क करेगी।'
        : 'Thank you so much! Your site visit is confirmed. Our sales executive will meet you at the site.',
    },
    metadata: {
      leadId: lead._id.toString(),
      crmUserId: requestingUser?._id ? requestingUser._id.toString() : undefined,
      language: isHindi ? 'hindi' : 'english_indian',
    },
  };

  const response = await fetch('https://api.vapi.ai/call/phone', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const resJson = await response.json();

  if (!response.ok) {
    const errorMsg = resJson.message || resJson.error || JSON.stringify(resJson);
    console.error('[VAPI CALL FAILED]:', errorMsg);
    if (typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('international')) {
      throw new Error('Free Vapi numbers only support US/Canada calls. To call Indian mobile numbers (+91), link a Twilio number with India Geo-permission enabled, or use the 100% Free In-Browser AI Smart Call.');
    }
    throw new Error(errorMsg);
  }

  // Record initial remark in CRM
  await Remark.create({
    Lead: lead._id,
    user: requestingUser?._id || lead.assignedTo || lead.createdBy,
    type: 'call',
    content: `Vapi Outbound AI Cellular Call placed (${isHindi ? 'Hindi' : 'English'}). Call ID: ${resJson.id || 'N/A'}. Dialing ${cleanPhone}...`,
  });

  console.log(`[VAPI SUCCESS] Dispatched call to ${cleanPhone} (${lead.name}) in ${isHindi ? 'Hindi' : 'English'}. Call ID: ${resJson.id}`);

  return {
    success: true,
    callId: resJson.id,
    dialedNumber: cleanPhone,
    language: isHindi ? 'Hindi (हिंदी)' : 'English (Indian)',
    lead: { id: lead._id, name: lead.name, phone: cleanPhone },
    data: resJson,
  };
};

/**
 * Handles Webhook payload sent by Vapi when an outbound cellular call finishes
 */
const handleVapiWebhook = async (body) => {
  const message = body?.message;
  if (!message) return { received: true };

  const messageType = message.type;
  if (messageType === 'end-of-call-report') {
    const callMetadata = message.call?.metadata || {};
    const leadId = callMetadata.leadId;
    const transcript = message.transcript || '';
    const summary = message.summary || message.analysis?.summary || 'AI Call completed';

    if (!leadId) {
      console.warn('Vapi Webhook: No leadId found in call metadata');
      return { success: true, warning: 'No leadId in metadata' };
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      console.warn('Vapi Webhook: Lead not found:', leadId);
      return { success: false, message: 'Lead not found' };
    }

    const lowerText = `${transcript} ${summary}`.toLowerCase();
    const confirmedVisit =
      lowerText.includes('site visit') ||
      lowerText.includes('साइट विजिट') ||
      lowerText.includes('saturday') ||
      lowerText.includes('शनिवार') ||
      lowerText.includes('sunday') ||
      lowerText.includes('रविवार') ||
      lowerText.includes('confirmed') ||
      lowerText.includes('कन्फर्म') ||
      lowerText.includes('weekend');

    const oldStage = lead.pipelineStage || 'NEW';

    // Log call remark
    await Remark.create({
      Lead: lead._id,
      user: callMetadata.crmUserId || lead.assignedTo || lead.createdBy,
      type: 'call',
      content: `Vapi AI Outbound Call Completed.\nSummary: ${summary}\nOutcome: ${confirmedVisit ? 'SITE VISIT CONFIRMED' : 'Call Connected'}\nDuration: ${message.durationSeconds || 0}s`,
    });

    if (confirmedVisit && oldStage !== 'SITE_VISIT_PLANNED') {
      lead.pipelineStage = 'SITE_VISIT_PLANNED';
      await lead.save();

      await LeadStageHistory.create({
        lead: lead._id,
        oldStage,
        newStage: 'SITE_VISIT_PLANNED',
        changedBy: callMetadata.crmUserId || lead.assignedTo || lead.createdBy,
        notes: `Vapi Outbound Call: Customer confirmed on-site visit during automated discussion.\nSummary: ${summary}`,
      });

      // Find managers and alert them
      let teamIds = lead.team ? [lead.team] : [];
      if (!teamIds.length && lead.assignedTo) {
        const owner = await User.findById(lead.assignedTo).select('teamIds');
        teamIds = owner?.teamIds || [];
      }

      const managers = teamIds.length
        ? await User.find({ role: 'manager', teamIds: { $in: teamIds }, isActive: true, isDeleted: { $ne: true } })
        : await User.find({ role: 'manager', isActive: true, isDeleted: { $ne: true } });

      for (const mgr of managers) {
        await sendLeadStageNotificationEmail(mgr, lead);
      }

      console.log(`[VAPI] Lead ${lead.name} advanced to SITE_VISIT_PLANNED and managers notified.`);
    }

    return { success: true, processedLead: lead._id, stage: lead.pipelineStage };
  }

  return { received: true };
};

module.exports = {
  triggerVapiOutboundCall,
  handleVapiWebhook,
  formatE164Phone,
};
