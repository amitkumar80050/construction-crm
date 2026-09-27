const nodemailer = require('nodemailer');
const config = require('../config/env');
const { createNotification } = require('./inAppNotificationService');

const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpPort === '465',
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
});

const sendWelcomeEmail = async (email, name) => {
  try {
    await transporter.sendMail({
      from: `"Construction CRM" <himanshu.prpwebs@gmail.com>`,
      to: email,
      subject: 'Welcome to Construction CRM',
      html: `
        <h1>Welcome to Construction CRM!</h1>
        <p>Hello ${name},</p>
        <p>Your account has been successfully created. You can now log in to start managing your clients.</p>
        <p>Login URL: ${config.clientUrl}/login</p>
        <p>Thank you for choosing Construction CRM!</p>
      `,
    });
  } catch (error) {
    console.error('Welcome email error:', error);
  }
};

const sendResetPasswordEmail = async (email, name, token) => {
  try {
    const resetUrl = `${config.clientUrl}/reset-password/${token}`;
    await transporter.sendMail({
      from: `"Construction CRM" <himanshu.prpwebs@gmail.com>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset</h1>
        <p>Hello ${name},</p>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link will expire in 30 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
  } catch (error) {
    console.error('Reset password email error:', error);
  }
};

const sendOtpEmail = async (email, name, otp, expiryMinutes) => {
  try {
    await transporter.sendMail({
      from: `"Construction CRM" <himanshu.prpwebs@gmail.com>`,
      to: email,
      subject: 'Your Verification Code',
      html: `
        <h1>Verification Code</h1>
        <p>Hello ${name},</p>
        <p>Your verification code is:</p>
        <h2 style="letter-spacing: 4px;">${otp}</h2>
        <p>This code will expire in ${expiryMinutes} minutes.</p>
        <p>If you did not request this code, please contact your administrator immediately.</p>
      `,
    });
  } catch (error) {
    console.error('OTP email error:', error);
    throw error;
  }
};

const sendReminderEmail = async (reminder) => {
  try {
    const client = await reminder.populate('client', 'name company email');
    await transporter.sendMail({
      from: `"Construction CRM Reminders" <himanshu.prpwebs@gmail.com>`,
      to: reminder.user.email,
      subject: `Reminder: ${reminder.title}`,
      html: `
        <h1>Reminder Notification</h1>
        <p><strong>Title:</strong> ${reminder.title}</p>
        <p><strong>Client:</strong> ${reminder.client.name}</p>
        <p><strong>Company:</strong> ${reminder.client.company}</p>
        <p><strong>Due Date:</strong> ${new Date(reminder.dueDate).toLocaleString()}</p>
        <p><strong>Priority:</strong> ${reminder.priority}</p>
        ${reminder.description ? `<p><strong>Description:</strong> ${reminder.description}</p>` : ''}
        <p><a href="${config.clientUrl}/clients/${reminder.client._id}">View Client</a></p>
      `,
    });
  } catch (error) {
    console.error('Reminder email error:', error);
  }
};

const sendUserCreatedOtpEmail = async (email, name, userId, otp, expiryMinutes) => {
  try {
    await transporter.sendMail({
      from: `"Construction CRM" <himanshu.prpwebs@gmail.com>`,
      to: email,
      subject: 'BuildTrack Pro CRM - Verify Your Account',
      html: `
        <h1>Verify Your Account</h1>
        <p>Hello ${name},</p>
        <p>Your BuildTrack Pro CRM account has been created by the administrator.</p>
        <p><strong>User ID:</strong> ${userId}</p>
        <p>Your verification OTP is:</p>
        <h2 style="letter-spacing: 4px;">${otp}</h2>
        <p>This OTP is valid for ${expiryMinutes} minutes.</p>
        <p>Please use this OTP to verify your account.</p>
        <p>If you did not expect this account, please contact your administrator.</p>
        <p>Regards,<br/>BuildTrack Pro CRM</p>
      `,
    });
  } catch (error) {
    console.error('User-created OTP email error:', error);
    throw error; // caller must know if this failed, so it can leave the user in a resendable state
  }
};

const sendSiteVisitAssignmentEmail = async (user, visit) => {
  await createNotification({
    recipient: user._id,
    type: 'SITE_VISIT_ASSIGNED',
    title: 'New site visit assigned',
    message: `A site visit is scheduled for ${new Date(visit.scheduledAt).toLocaleString()} at ${visit.address}.`,
    entityType: 'SiteVisit',
    entityId: visit._id,
  }).catch((error) => console.error('Site visit in-app notification error:', error.message));
  try {
    await transporter.sendMail({
      from: '"Construction CRM" <himanshu.prpwebs@gmail.com>',
      to: user.email,
      subject: 'New site visit assigned',
      html: `<p>Hello ${user.name},</p><p>A site visit has been assigned to you for ${new Date(visit.scheduledAt).toLocaleString()}.</p><p><strong>Location:</strong> ${visit.address}</p><p><strong>Priority:</strong> ${visit.priority}</p>`,
    });
  } catch (error) { console.error('Site visit notification error:', error); }
};

const sendAttendanceDecisionEmail = async (user, status, remarks) => {
  await createNotification({
    recipient: user._id,
    type: `ATTENDANCE_${status}`,
    title: `Attendance ${status.toLowerCase()}`,
    message: remarks ? `Your attendance was ${status.toLowerCase()}: ${remarks}` : `Your attendance was ${status.toLowerCase()}.`,
    entityType: 'Attendance',
  }).catch((error) => console.error('Attendance in-app notification error:', error.message));
  try {
    await transporter.sendMail({
      from: '"Construction CRM" <himanshu.prpwebs@gmail.com>',
      to: user.email,
      subject: `Attendance ${status.toLowerCase()}`,
      html: `<p>Hello ${user.name},</p><p>Your attendance request was <strong>${status.toLowerCase()}</strong>.</p>${remarks ? `<p>Manager remarks: ${remarks}</p>` : ''}`,
    });
  } catch (error) { console.error('Attendance notification error:', error); }
};

const sendLeadAssignmentEmail = async (user, lead) => {
  await createNotification({
    recipient: user._id,
    type: 'LEAD_ASSIGNED',
    title: 'Lead assigned to you',
    message: `${lead.name} has been assigned to you.`,
    entityType: 'Client',
    entityId: lead._id,
  });
  try {
    await transporter.sendMail({
      from: '"Construction CRM" <himanshu.prpwebs@gmail.com>',
      to: user.email,
      subject: 'A lead has been assigned to you',
      html: `<p>Hello ${user.name},</p><p><strong>${lead.name}</strong> has been assigned to you. Please follow up with the customer.</p>`,
    });
  } catch (error) { console.error('Lead assignment email error:', error.message); }
};

const sendLeadStageNotificationEmail = async (user, lead) => {
  await createNotification({
    recipient: user._id,
    type: 'LEAD_SITE_VISIT_PLANNED',
    title: 'Lead is ready for a site visit',
    message: `${lead.name} has reached Site Visit Planned. Assign a Sales Executive to schedule the visit.`,
    entityType: 'Client',
    entityId: lead._id,
  });
  try {
    await transporter.sendMail({
      from: '"Construction CRM" <himanshu.prpwebs@gmail.com>',
      to: user.email,
      subject: 'Lead ready for site visit assignment',
      html: `<p>Hello ${user.name},</p><p><strong>${lead.name}</strong> has reached Site Visit Planned and is ready for a Sales Executive assignment.</p>`,
    });
  } catch (error) { console.error('Lead stage email error:', error.message); }
};

const sendSiteVisitStatusEmail = async (user, visit, status) => {
  await createNotification({
    recipient: user._id,
    type: `SITE_VISIT_${status}`,
    title: `Site visit ${status.toLowerCase().replace('_', ' ')}`,
    message: `Site visit ${visit._id} was marked ${status.toLowerCase().replace('_', ' ')}.${(visit.notes || visit.completionNotes) ? ` Notes: ${visit.notes || visit.completionNotes}` : ''}`,
    entityType: 'SiteVisit',
    entityId: visit._id,
  }).catch((error) => console.error('Site visit status in-app notification error:', error.message));
  try {
    await transporter.sendMail({
      from: '"Construction CRM" <himanshu.prpwebs@gmail.com>',
      to: user.email,
      subject: `Site visit ${status}`,
      html: `<p>Hello ${user.name},</p><p>Site visit <strong>${visit._id}</strong> was marked <strong>${status}</strong> by the assigned executive.</p>${(visit.notes || visit.completionNotes) ? `<p>Notes: ${visit.notes || visit.completionNotes}</p>` : ''}`,
    });
  } catch (error) { console.error('Site visit status notification error:', error); }
};

module.exports = {
  sendWelcomeEmail,
  sendResetPasswordEmail,
  sendOtpEmail,
  sendReminderEmail,
  sendUserCreatedOtpEmail,
  sendSiteVisitAssignmentEmail,
  sendAttendanceDecisionEmail,
  sendLeadAssignmentEmail,
  sendLeadStageNotificationEmail,
  sendSiteVisitStatusEmail,
};