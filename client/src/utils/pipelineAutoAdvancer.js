import api from '../services/api';

const PIPELINE = ['NEW', 'CONNECTED', 'INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED', 'SITE_VISIT_DONE', 'QUOTATION', 'CONVERTED'];

/**
 * Sequentially advances a lead through pipeline stages to satisfy strict server-side sequential transition checks
 */
export const advanceLeadPipelineSequentially = async (lead, targetStage, outcomeNotes = '', suggestedDate = null) => {
  if (!lead?._id && !lead?.id) {
    return { success: false, message: 'Invalid lead ID' };
  }

  const leadId = lead._id || lead.id;
  const currentStage = (lead.pipelineStage || 'NEW').toUpperCase().replace(/\s+/g, '_');
  const currentIndex = PIPELINE.indexOf(currentStage);
  const targetIndex = PIPELINE.indexOf(targetStage);

  if (targetIndex === -1) {
    return { success: false, message: `Unknown target stage: ${targetStage}` };
  }

  if (targetIndex <= currentIndex) {
    return { success: true, message: `Lead already at or beyond ${targetStage}`, currentStage };
  }

  const defaultDate = suggestedDate || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];

  const results = [];
  let latestStage = currentStage;

  for (let i = currentIndex + 1; i <= targetIndex; i += 1) {
    const nextStage = PIPELINE[i];
    const isTarget = i === targetIndex;
    const noteText = isTarget && outcomeNotes
      ? outcomeNotes
      : `AI Telecaller Workflow: Auto-advancing stage to ${nextStage.replace(/_/g, ' ')} following customer voice conversation.`;

    const payload = {
      newStage: nextStage,
      notes: noteText,
    };

    if (nextStage === 'FOLLOW_UP') {
      payload.followUpDate = defaultDate;
    }

    try {
      const res = await api.patch(`/leads/${leadId}/stage`, payload);
      latestStage = nextStage;
      results.push({ stage: nextStage, success: true, data: res.data });
    } catch (err) {
      console.error(`Failed at stage step ${nextStage}:`, err.response?.data?.message || err.message);
      return {
        success: results.length > 0,
        latestStage,
        error: err.response?.data?.message || err.message,
        results,
      };
    }
  }

  return {
    success: true,
    latestStage,
    results,
    reachedSiteVisitPlanned: latestStage === 'SITE_VISIT_PLANNED',
  };
};
