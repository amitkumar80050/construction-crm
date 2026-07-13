const nodemailer = require('nodemailer');
const config = require('../config/env');

// Create transporter
const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpPort === '465',
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
});

// Send welcome email
const sendWelcomeEmail = async (email, name) => {
  try {
    await transporter.sendMail({
      from: `"Construction CRM" <${config.smtpUser}>`,
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

// Send reset password email
const sendResetPasswordEmail = async (email, name, token) => {
  try {
    const resetUrl = `${config.clientUrl}/reset-password/${token}`;
    
    await transporter.sendMail({
      from: `"Construction CRM" <${config.smtpUser}>`,
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

// Send reminder email
const sendReminderEmail = async (reminder) => {
  try {
    const client = await reminder.populate('client', 'name company email');
    
    await transporter.sendMail({
      from: `"Construction CRM Reminders" <${config.smtpUser}>`,
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

module.exports = {
  sendWelcomeEmail,
  sendResetPasswordEmail,
  sendReminderEmail,
};