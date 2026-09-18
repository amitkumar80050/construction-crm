const nodemailer = require('nodemailer');
const config = require('../config/env');

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

const sendOtpEmail = async (email, name, otp, expiryMinutes) => {
  try {
    await transporter.sendMail({
      from: `"Construction CRM" <${config.smtpUser}>`,
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

const sendUserCreatedOtpEmail = async (email, name, userId, otp, expiryMinutes) => {
  try {
    await transporter.sendMail({
      from: `"Construction CRM" <${config.smtpUser}>`,
      to: email,
      subject: 'BuildFlow CRM - Verify Your Account',
      html: `
        <h1>Verify Your Account</h1>
        <p>Hello ${name},</p>
        <p>Your BuildFlow CRM account has been created by the administrator.</p>
        <p><strong>User ID:</strong> ${userId}</p>
        <p>Your verification OTP is:</p>
        <h2 style="letter-spacing: 4px;">${otp}</h2>
        <p>This OTP is valid for ${expiryMinutes} minutes.</p>
        <p>Please use this OTP to verify your account.</p>
        <p>If you did not expect this account, please contact your administrator.</p>
        <p>Regards,<br/>BuildFlow CRM</p>
      `,
    });
  } catch (error) {
    console.error('User-created OTP email error:', error);
    throw error; // caller must know if this failed, so it can leave the user in a resendable state
  }
};

module.exports = {
  sendWelcomeEmail,
  sendResetPasswordEmail,
  sendOtpEmail,
  sendReminderEmail,
  sendUserCreatedOtpEmail,
};