/**
 * AI Lead Conversation & Persuasion Engine
 * Tailored specifically for Construction & Real Estate CRM.
 * Supports Two Languages: Indian English (en-IN) and Hindi (हिंदी).
 * Operates 100% free with built-in dynamic NLP dialogue engine, with optional Gemini API enhancement.
 */

export const formatCurrency = (val) => {
  if (!val && val !== 0) return '₹45,00,000';
  const num = Number(val);
  if (isNaN(num)) return `₹${val}`;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
};

export const getLeadCredentials = (lead) => {
  const name = lead?.name || 'Valued Customer';
  const company = lead?.company || 'Premium Residential Project';
  const phone = lead?.phone || 'Unknown Phone';
  const city = lead?.address?.city || lead?.address?.street || 'Prime City Location';
  const budget = lead?.projectValue ? formatCurrency(lead.projectValue) : '₹45 - 65 Lakhs';
  const stage = lead?.pipelineStage || 'NEW';

  return { name, company, phone, city, budget, stage };
};

export const generateOpeningPitch = (lead, language = 'en-IN') => {
  const { name, company, city, budget } = getLeadCredentials(lead);
  const isHindi = language === 'hi' || language === 'hindi';

  if (isHindi) {
    return `नमस्ते ${name} जी, मैं अपेक्स कंस्ट्रक्शन से सोफिया बोल रही हूँ। मैं हमारे ${company} प्रोजेक्ट (${city}) के बारे में बात करने के लिए कॉल कर रही हूँ। आपके ${budget} के अनुमानित बजट में हमारे पास बेहतरीन लग्जरी फ्लैट्स और विला उपलब्ध हैं। क्या आपके पास 2 मिनट का समय है?`;
  }

  return `Hello ${name}, good day! This is Sophia from the Apex Construction Sales Advisory Team. I noticed your interest in our ${company} development situated in ${city}. We currently have exclusive customized units aligned with your estimated budget of ${budget}, featuring top-grade construction, zero brokerage, and flexible milestone payment plans. Do you have two minutes to discuss your dream project requirements?`;
};

/**
 * Pre-engineered autonomous multi-turn dialogue tailored to the lead's credentials
 * Supports Hindi and Indian English
 */
export const generateAutoDialogue = (lead, language = 'en-IN') => {
  const { name, company, city, budget } = getLeadCredentials(lead);
  const isHindi = language === 'hi' || language === 'hindi';

  if (isHindi) {
    return [
      {
        sender: 'ai',
        text: `नमस्ते ${name} जी, मैं अपेक्स कंस्ट्रक्शन से सोफिया बोल रही हूँ। आपके ${company} प्रोजेक्ट में 2 और 3 BHK के शानदार यूनिट्स आपके ${budget} बजट में उपलब्ध हैं। आप कब तक पजेशन लेने की योजना बना रहे हैं?`,
        timestamp: '00:03',
        sentiment: 'friendly',
      },
      {
        sender: 'lead',
        text: `नमस्ते सोफिया जी, मैं अगले 4 से 6 महीनों में घर देख रहा हूँ। लेकिन क्या यह प्रोजेक्ट RERA अप्रूव्ड है और बैंक लोन की क्या सुविधा है?`,
        timestamp: '00:15',
        sentiment: 'interested_cautious',
      },
      {
        sender: 'ai',
        text: `जी बिल्कुल ${name} जी! हमारा प्रोजेक्ट 100% RERA रजिस्टर्ड है। इसमें SBI और HDFC से 20:80 आसान कंस्ट्रक्शन-लिंक्ड पेमेंट प्लान मिल रहा है, यानी पजेशन तक बहुत कम ईएमआई। साथ ही टाटा टिस्कॉन स्टील और अल्ट्राटेक सीमेंट के साथ 5 साल की स्ट्रक्चरल गारंटी दी जा रही है।`,
        timestamp: '00:34',
        sentiment: 'persuasive',
      },
      {
        sender: 'lead',
        text: `यह तो बहुत ही बढ़िया ऑफर है। क्या मैं इस वीकेंड साइट पर आकर सैंपल फ्लैट और लोकेशन देख सकता हूँ?`,
        timestamp: '00:48',
        sentiment: 'very_interested',
      },
      {
        sender: 'ai',
        text: `बिल्कुल ${name} जी! हम आपको फ्री वीआईपी साइट विजिट कराएंगे, जिसमें आपके घर से फ्री कैब पिकअप और हमारे सीनियर स्ट्रक्चरल इंजीनियर का पर्सनल गाइडेंस रहेगा। क्या आप इस शनिवार सुबह 11:00 बजे आ सकते हैं?`,
        timestamp: '01:05',
        sentiment: 'closing',
      },
      {
        sender: 'lead',
        text: `हाँ, शनिवार सुबह 11:00 बजे का समय मेरे और मेरे परिवार के लिए बिल्कुल सही रहेगा। कृपया साइट विजिट कन्फर्म कर दीजिए।`,
        timestamp: '01:21',
        sentiment: 'site_visit_confirmed',
      },
      {
        sender: 'ai',
        text: `शानदार ${name} जी! आपकी साइट विजिट इस शनिवार सुबह 11:00 बजे कन्फर्म हो गई है। मैं हमारे टीम मैनेजर को तुरंत नोटिफिकेशन भेज रही हूँ ताकि आपके लिए हमारे फील्ड सेल्स एग्जीक्यूटिव को असाइन कर सकें। धन्यवाद!`,
        timestamp: '01:38',
        sentiment: 'delighted',
      },
    ];
  }

  // English (Indian)
  return [
    {
      sender: 'ai',
      text: `Hello ${name}, good day! I am Sophia from Apex Construction CRM. I am following up on your inquiry for ${company} in ${city}. We have limited luxury 2 & 3 BHK units perfectly matching your budget of ${budget}. How soon are you planning for possession?`,
      timestamp: '00:03',
      sentiment: 'friendly',
    },
    {
      sender: 'lead',
      text: `Hi Sophia, yes I am looking to purchase within the next 4 to 6 months. But I am concerned about the payment terms and whether the project is RERA certified.`,
      timestamp: '00:14',
      sentiment: 'interested_cautious',
    },
    {
      sender: 'ai',
      text: `That is a great timeline, ${name}! Yes, our ${company} is 100% RERA registered with all environmental clearances. For payments, we are offering an exclusive 20:80 bank-approved construction-linked plan with SBI and HDFC, so you only pay as construction progresses with zero pre-EMI burden. Plus, we provide a 5-year structural warranty with UltraTech Grade-A cement and Tata steel.`,
      timestamp: '00:32',
      sentiment: 'persuasive',
    },
    {
      sender: 'lead',
      text: `That sounds reassuring. The payment plan fits my expectations. Can I come down to the site to see the sample flat and location connectivity?`,
      timestamp: '00:46',
      sentiment: 'very_interested',
    },
    {
      sender: 'ai',
      text: `Absolutely! We would love to host you for a VIP on-site visit. We provide complimentary doorstep pickup and a dedicated Senior Structural Engineer to guide you through the model flat and material lab. Would this upcoming Saturday or Sunday at 11:00 AM work best for you?`,
      timestamp: '01:02',
      sentiment: 'closing',
    },
    {
      sender: 'lead',
      text: `Saturday at 11:00 AM works perfectly for my family. Please confirm the site visit and have someone share the location on my WhatsApp.`,
      timestamp: '01:18',
      sentiment: 'site_visit_confirmed',
    },
    {
      sender: 'ai',
      text: `Wonderful, ${name}! Your Site Visit is officially confirmed for this Saturday at 11:00 AM. I am notifying our Team Manager immediately to assign our top Field Sales Executive to assist you. Thank you for choosing us, and we look forward to meeting you!`,
      timestamp: '01:34',
      sentiment: 'delighted',
    },
  ];
};

/**
 * Intelligent reactive response engine based on lead speech/text input
 * Supports Hindi and Indian English
 */
export const generateAIResponse = async (lead, userMessage, conversationHistory = [], apiKey = null, language = 'en-IN') => {
  const { name, company, city, budget } = getLeadCredentials(lead);
  const lower = (userMessage || '').toLowerCase();
  const isHindi = language === 'hi' || language === 'hindi';

  // Optional Gemini API call if key is configured
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const languageInstruction = isHindi
        ? 'Speak in natural, respectful Hindi / Hinglish. Address the customer in Hindi.'
        : 'Speak in natural Indian English using Indian terms (Lakhs, Crores, RERA, Vastu).';

      const prompt = `You are Sophia, an expert construction and real estate telecaller for "Apex Construction CRM". 
Language: ${languageInstruction}
You are speaking on phone with a potential leadnamed "${name}".
Lead Credentials:
- Interested Project: ${company}
- Location: ${city}
- Target Budget: ${budget}
- Current CRM Pipeline Stage: ${lead.pipelineStage || 'NEW'}

Goal: Persuade the lead with professional construction details (RERA approved, Grade-A materials, flexible 20:80 payment schemes, high ROI, complimentary site visit). Convince them to confirm an on-site visit or advance their CRM stage.
Keep your response concise (2-4 sentences max), conversational for voice telephony, warm, confident, and closing towards a site visit.

Customer said: "${userMessage}"
Your response as Sophia (${isHindi ? 'in Hindi' : 'in Indian English'}):`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.7 }
        })
      });

      if (response.ok) {
        const json = await response.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          return text.trim();
        }
      }
    } catch (e) {
      console.warn('Gemini API call failed, falling back to built-in persuasion engine:', e.message);
    }
  }

  // Built-in Smart Construction CRM Persuasion Engine in HINDI
  if (isHindi) {
    if (lower.includes('साइट') || lower.includes('विजिट') || lower.includes('शनिवार') || lower.includes('रविवार') || lower.includes('देखने') || lower.includes('visit') || lower.includes('saturday') || lower.includes('sunday')) {
      return `बहुत बढ़िया ${name} जी! हम आपकी वीआईपी साइट विजिट ${company} (${city}) के लिए बुक कर रहे हैं। हमारे सीनियर इंजीनियर आपको मॉडल फ्लैट दिखाएंगे और फ्री कैब पिकअप उपलब्ध रहेगा। क्या हम इस शनिवार सुबह 11:00 बजे का स्लॉट पक्का करें?`;
    }

    if (lower.includes('बजट') || lower.includes('महंगा') || lower.includes('दाम') || lower.includes('कीमत') || lower.includes('छूट') || lower.includes('डिस्काउंट') || lower.includes('price') || lower.includes('cost')) {
      return `${name} जी, आपकी बजट चिंता मैं समझ सकती हूँ। आपके ${budget} के दायरे में हम विशेष प्री-लॉन्च कीमत और स्पॉट बुकिंग पर ज़ीरो स्टैम्प ड्यूटी का लाभ दे रहे हैं। 20:80 पेमेंट प्लान से आपकी शुरुआती जेब पर कोई भार नहीं पड़ेगा। आइए एक बार साइट विजिट करके खुद क्वालिटी देखिए!`;
    }

    if (lower.includes('क्वालिटी') || lower.includes('रेरा') || lower.includes('देरी') || lower.includes('rera') || lower.includes('पजेशन') || lower.includes('मजबूती')) {
      return `निश्चिंत रहें ${name} जी। हमारा पूरा प्रोजेक्ट 100% RERA अप्रूव्ड है। इसमें केवल टाटा टिस्कॉन 550D TMT सरिया और अल्ट्राटेक ग्रेड-ए सीमेंट का उपयोग होता है, जिसे 5 साल की गारंटी दी जाती है। समय पर पजेशन हमारी पहली प्राथमिकता है।`;
    }

    if (lower.includes('लोन') || lower.includes('किस्त') || lower.includes('बैंक') || lower.includes('emi') || lower.includes('loan')) {
      return `हमारे पास SBI, HDFC और ICICI बैंक से सीधे अप्रूवल हैं, जहां सबसे कम 8.35% ब्याज दर पर बिना प्रोसेसिंग फीस के होम लोन मिल रहा है। हमारा बैंक प्रतिनिधि आपके घर आकर सारा पेपरवर्क पूरा करा देगा।`;
    }

    if (lower.includes('बिजी') || lower.includes('बाद में') || lower.includes('कल') || lower.includes('गाड़ी') || lower.includes('busy') || lower.includes('later')) {
      return `कोई बात नहीं ${name} जी। मैं कल आपको उचित समय पर दोबारा कॉल करूँगी। तब तक मैं आपके WhatsApp (${lead.phone}) पर प्रोजेक्ट का पूरा डिजिटल ब्रोशर और फ्लोर प्लान भेज रही हूँ। शुभ दिन!`;
    }

    if (lower.includes('हाँ') || lower.includes('ठीक है') || lower.includes('चलेगा') || lower.includes('yes') || lower.includes('sure') || lower.includes('ok')) {
      return `शानदार ${name} जी! आपकी पुष्टि दर्ज कर ली गई है। मैं हमारे टीम मैनेजर को सूचित कर रही हूँ ताकि आपके लिए सीनियर सेल्स एग्जीक्यूटिव को नियुक्त कर दिया जाए। आपसे मिलकर हमें बहुत खुशी होगी!`;
    }

    return `धन्यवाद ${name} जी। ${company} में हर घर 100% वास्तु-सम्मत और हवादार डिजाइन किया गया है जो आपके ${budget} बजट में पूरी तरह फिट बैठता है। क्या आप इस वीकेंड साइट पर आकर खुद देखना पसंद करेंगे?`;
  }

  // Built-in Smart Construction CRM Persuasion Engine in INDIAN ENGLISH
  if (lower.includes('site visit') || lower.includes('visit') || lower.includes('saturday') || lower.includes('sunday') || lower.includes('see the flat') || lower.includes('come') || lower.includes('location')) {
    return `That's wonderful, ${name}! I will schedule your VIP site visit for ${company} in ${city}. We will arrange a personal site tour with our Senior Engineer and provide complimentary pickup. Shall I book your slot for this weekend at 11:00 AM?`;
  }

  if (lower.includes('price') || lower.includes('budget') || lower.includes('expensive') || lower.includes('cost') || lower.includes('discount') || lower.includes('lakh') || lower.includes('crore')) {
    return `I completely understand, ${name}. Within your range of ${budget}, we offer special pre-launch pricing and a zero-stamp-duty waiver for spot bookings. Plus, with our 20:80 milestone construction payment plan, your monthly outgo is minimal. Let's arrange a 15-minute site visit so you can see the value firsthand!`;
  }

  if (lower.includes('quality') || lower.includes('rera') || lower.includes('delay') || lower.includes('material') || lower.includes('builder') || lower.includes('possession')) {
    return `Rest assured, ${name}. All our developments are fully RERA approved with strict milestone audits. We construct using Tata Tiscon Fe-550D TMT steel and UltraTech Grade-A cement, backed by a 5-year structural warranty and committed penalty-clause delivery. Quality and trust are our top priorities.`;
  }

  if (lower.includes('loan') || lower.includes('emi') || lower.includes('bank') || lower.includes('finance')) {
    return `We have direct tie-ups with leading banks including SBI, HDFC, ICICI, and Axis Bank offering home loans starting at 8.35% with zero processing fee. Our dedicated finance team will manage all paperwork for you at no extra charge!`;
  }

  if (lower.includes('busy') || lower.includes('call later') || lower.includes('driving') || lower.includes('not now') || lower.includes('tomorrow')) {
    return `I completely understand, ${name}. I will schedule a convenient callback for you tomorrow, and in the meantime, I'll send the detailed project brochure and floor plans directly to your WhatsApp at ${lead.phone || 'your number'}. Have a great day!`;
  }

  if (lower.includes('yes') || lower.includes('okay') || lower.includes('sure') || lower.includes('sounds good') || lower.includes('confirm')) {
    return `Fantastic, ${name}! I am locking in your confirmation right now and alerting our Team Manager to assign an expert Field Sales Executive to assist you. We are excited to partner with you on your construction journey!`;
  }

  return `Thank you for sharing that, ${name}. At ${company}, we ensure every home is designed with maximum ventilation, Vastu compliance, and premium finishes well within ${budget}. Would you prefer a weekend site walkthrough or a detailed virtual 3D tour first?`;
};

/**
 * Analyzes conversation and produces structured CRM outcome
 */
export const analyzeCallOutcome = (transcript = [], lead = null) => {
  const fullText = transcript.map(t => `${t.sender}: ${t.text}`).join(' ').toLowerCase();

  let confirmedVisit = false;
  let recommendedStage = 'CONNECTED';
  let sentimentScore = 80;
  let sentimentTag = 'Positive';

  if (
    fullText.includes('site visit') ||
    fullText.includes('साइट विजिट') ||
    fullText.includes('saturday') ||
    fullText.includes('शनिवार') ||
    fullText.includes('sunday') ||
    fullText.includes('रविवार') ||
    fullText.includes('visit is officially confirmed') ||
    fullText.includes('visit planned') ||
    fullText.includes('come down to the site') ||
    fullText.includes('weekend') ||
    fullText.includes('कन्फर्म')
  ) {
    confirmedVisit = true;
    recommendedStage = 'SITE_VISIT_PLANNED';
    sentimentScore = 96;
    sentimentTag = 'Highly Interested & Confirmed';
  } else if (fullText.includes('call later') || fullText.includes('tomorrow') || fullText.includes('follow up') || fullText.includes('busy') || fullText.includes('कल')) {
    recommendedStage = 'FOLLOW_UP';
    sentimentScore = 75;
    sentimentTag = 'Follow-up Scheduled';
  } else if (fullText.includes('interested') || fullText.includes('price') || fullText.includes('budget') || fullText.includes('loan') || fullText.includes('rera') || fullText.includes('बजट')) {
    recommendedStage = 'INTERESTED';
    sentimentScore = 88;
    sentimentTag = 'Engaged & Interested';
  }

  const dateTomorrow = new Date();
  dateTomorrow.setDate(dateTomorrow.getDate() + 2);
  const suggestedDate = dateTomorrow.toISOString().split('T')[0];

  const summary = `AI Telecaller Call Summary:
- Customer: ${lead?.name || 'Lead'} (${lead?.phone || 'N/A'})
- Project Interest: ${lead?.company || 'Construction Project'} (${lead?.projectValue ? formatCurrency(lead.projectValue) : '₹45L - 60L'})
- Outcome: ${sentimentTag}
- Sentiment Score: ${sentimentScore}%
- Key Discussion: Addressed budget terms, RERA compliance, structural quality, and site inspection.
- Next Recommended Step: ${confirmedVisit ? 'SITE VISIT CONFIRMED. Manager alert sent to assign Field Sales Executive.' : 'Follow up as requested.'}`;

  return {
    confirmedVisit,
    recommendedStage,
    sentimentScore,
    sentimentTag,
    summary,
    suggestedDate,
  };
};
