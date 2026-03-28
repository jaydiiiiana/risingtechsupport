import type { VercelRequest, VercelResponse } from '@vercel/node';
import emailjs from '@emailjs/nodejs';
import dotenv from 'dotenv';

dotenv.config();

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  // Get parameters from frontend
  const templateParams = request.body;

  const SERVICE_ID = process.env.VITE_EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = process.env.VITE_EMAILJS_TEMPLATE_ID;
  const PUBLIC_KEY = process.env.VITE_EMAILJS_PUBLIC_KEY;
  const PRIVATE_KEY = process.env.VITE_EMAILJS_PRIVATE_KEY;

  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY || !PRIVATE_KEY) {
    return response.status(500).json({ 
      message: 'EmailJS Configuration missing on server. Please add VITE_EMAILJS_... keys to Vercel.' 
    });
  }

  try {
    const result = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      templateParams,
      {
        publicKey: PUBLIC_KEY,
        privateKey: PRIVATE_KEY,
      }
    );

    return response.status(200).json({ status: 'success', result });
  } catch (error: any) {
    console.error('EmailJS Error:', error);
    return response.status(500).json({ 
      message: error.text || error.message || 'Internal Server Error' 
    });
  }
}
