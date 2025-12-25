// Vercel Serverless Function - Email Capture (Partial Form Submission)
// POST /api/capture-email
// This captures emails even if users don't complete the full form

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { email, pageUri, hutk } = req.body;

    // Validate email
    if (!email || !email.trim()) {
      return res.status(400).json({ ok: false, error: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ ok: false, error: 'Invalid email format' });
    }

    // Get environment variables
    const portalId = process.env.HUBSPOT_PORTAL_ID;
    const formGuid = process.env.HUBSPOT_FORM_GUID;
    const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

    if (!portalId || !formGuid || !token) {
      console.error('Missing HubSpot environment variables');
      return res.status(500).json({ ok: false, error: 'Server configuration error' });
    }

    // Build HubSpot form submission payload with just email
    // This creates a contact in HubSpot even if they don't complete the full form
    const hubspotPayload = {
      fields: [
        { objectTypeId: '0-1', name: 'email', value: email.trim() },
      ],
      context: {
        pageUri: pageUri || '',
        pageName: 'go.yepzy.com Email Capture',
      },
    };

    // Add hutk (HubSpot tracking cookie) if present
    if (hutk) {
      hubspotPayload.context.hutk = hutk;
    }

    // Submit to HubSpot Forms API (secure endpoint)
    const hubspotUrl = `https://api.hubapi.com/submissions/v3/integration/secure/submit/${portalId}/${formGuid}`;

    const hubspotResponse = await fetch(hubspotUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(hubspotPayload),
    });

    if (!hubspotResponse.ok) {
      const errorData = await hubspotResponse.json().catch(() => ({}));
      console.error('HubSpot API error (email capture):', hubspotResponse.status, errorData);
      // Still return success to user - we don't want to block them
      // The full form submission will capture their data anyway
      return res.status(200).json({ ok: true, message: 'Email noted' });
    }

    // Success
    return res.status(200).json({ ok: true, message: 'Email captured successfully' });

  } catch (error) {
    console.error('Email capture error:', error);
    // Return success anyway to not block user experience
    return res.status(200).json({ ok: true, message: 'Email noted' });
  }
}

