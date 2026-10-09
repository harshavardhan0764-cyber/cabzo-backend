/**
 * MSG91 SMS OTP Service
 * Real Indian SMS delivery via MSG91 API v5
 * Docs: https://docs.msg91.com/reference/send-otp
 *
 * SECURITY: Never expose MSG91_AUTH_KEY to the frontend.
 * All credentials come from backend .env only.
 */

const axios = require('axios');

const MSG91_BASE_URL = 'https://control.msg91.com/api/v5/otp';

/**
 * Check whether MSG91 is properly configured.
 * Returns { configured: boolean, missing: string[] }
 */
function checkMsg91Config() {
  const missing = [];
  const authKey = (process.env.MSG91_AUTH_KEY || '').trim();
  const templateId = (process.env.MSG91_TEMPLATE_ID || '').trim();
  const senderId = (process.env.MSG91_SENDER_ID || '').trim();

  if (
    !authKey || 
    authKey.toLowerCase().includes('your_') || 
    authKey === 'YOUR_REAL_MSG91_AUTH_KEY' ||
    authKey === 'YOUR_MSG91_AUTH_KEY'
  ) {
    missing.push('MSG91_AUTH_KEY');
  }
  if (
    !templateId || 
    templateId.toLowerCase().includes('your_') || 
    templateId.toLowerCase().includes('approved_template') || 
    templateId === 'YOUR_APPROVED_TEMPLATE_ID' ||
    templateId === 'YOUR_MSG91_TEMPLATE_ID'
  ) {
    missing.push('MSG91_TEMPLATE_ID');
  }
  if (
    !senderId || 
    senderId.toLowerCase().includes('your_') || 
    senderId === 'YOUR_SENDER_ID' ||
    senderId === 'YOUR_MSG91_SENDER_ID'
  ) {
    missing.push('MSG91_SENDER_ID');
  }
  return { configured: missing.length === 0, missing };
}

/**
 * Send OTP via MSG91 to an Indian mobile number.
 *
 * @param {string} mobile - Format: 91XXXXXXXXXX (without +)
 * @param {string} otp    - 6-digit OTP string
 * @returns {Promise<{ success: boolean, message: string, requestId?: string }>}
 */
async function sendOTPviaMSG91(mobile, otp) {
  const config = checkMsg91Config();

  if (!config.configured) {
    console.warn('[MSG91] Missing configuration variables:', config.missing.join(', '));
    return {
      success: false,
      message: 'SMS service is not configured.',
      unconfigured: true,
      missing: config.missing
    };
  }

  // Normalise: strip leading + if present
  const mobileNum = mobile.replace(/^\+/, '');

  try {
    const payload = {
      template_id: process.env.MSG91_TEMPLATE_ID.trim(),
      mobile:      mobileNum,
      authkey:     process.env.MSG91_AUTH_KEY.trim(),
      otp_length:  parseInt(process.env.MSG91_OTP_LENGTH || '6', 10),
      otp_expiry:  parseInt(process.env.MSG91_OTP_EXPIRY || '5', 10),
      otp:         otp,
      OTP:         otp
    };

    if (process.env.MSG91_SENDER_ID && process.env.MSG91_SENDER_ID.trim() !== 'YOUR_SENDER_ID') {
      payload.sender = process.env.MSG91_SENDER_ID.trim();
    }

    const response = await axios.post(
      MSG91_BASE_URL,
      payload,
      {
        params: payload,
        headers: {
          'Content-Type': 'application/json',
          'authkey':      process.env.MSG91_AUTH_KEY.trim()
        },
        timeout: 10000 // 10s timeout
      }
    );

    const data = response.data;

    // MSG91 returns { type: 'success', message: '...' } on success
    if (data && (data.type === 'success' || data.type === 'success ')) {
      return {
        success: true,
        message: 'OTP sent via SMS',
        requestId: data.request_id || null
      };
    } else {
      console.error('[MSG91] Non-success response:', JSON.stringify(data));
      return {
        success: false,
        message: 'Unable to send OTP. Please try again.'
      };
    }
  } catch (err) {
    if (err.response) {
      console.error('[MSG91] HTTP error:', err.response.status, JSON.stringify(err.response.data));
    } else {
      console.error('[MSG91] Connection error:', err.message);
    }

    return {
      success: false,
      message: 'Unable to send OTP. Please try again.'
    };
  }
}

/**
 * Resend OTP via MSG91 (uses MSG91's retry endpoint)
 * @param {string} mobile - Format: 91XXXXXXXXXX
 * @param {'text'|'voice'} retryType
 */
async function resendOTPviaMSG91(mobile, retryType = 'text') {
  const config = checkMsg91Config();
  if (!config.configured) {
    return { success: false, message: 'SMS service is not configured.', unconfigured: true };
  }

  const mobileNum = mobile.replace(/^\+/, '');

  try {
    const response = await axios.post(
      `${MSG91_BASE_URL}/retry`,
      { authkey: process.env.MSG91_AUTH_KEY, mobile: mobileNum, retrytype: retryType },
      {
        headers: { 'Content-Type': 'application/json', 'authkey': process.env.MSG91_AUTH_KEY },
        timeout: 10000
      }
    );

    const data = response.data;
    if (data && (data.type === 'success' || data.type === 'success ')) {
      return { success: true, message: 'OTP resent via SMS' };
    }
    console.error('[MSG91] Resend non-success:', JSON.stringify(data));
    return { success: false, message: data.message || 'Resend failed. Please try again.' };
  } catch (err) {
    console.error('[MSG91] Resend error:', err.message);
    return { success: false, message: 'Unable to resend OTP. Please try again.' };
  }
}

module.exports = { sendOTPviaMSG91, resendOTPviaMSG91, checkMsg91Config };
