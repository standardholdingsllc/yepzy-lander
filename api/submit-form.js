// Vercel Serverless Function - HubSpot Form Submission
// POST /api/submit-form

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { firstname, lastname, company, email, phone, pageUri, hutk } = req.body;

    // Validate required fields
    const errors = [];
    if (!firstname || !firstname.trim()) errors.push('First name is required');
    if (!lastname || !lastname.trim()) errors.push('Last name is required');
    if (!email || !email.trim()) errors.push('Email is required');
    if (!phone || !phone.trim()) errors.push('Phone is required');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      errors.push('Invalid email format');
    }

    if (errors.length > 0) {
      return res.status(400).json({ ok: false, errors });
    }

    // Get environment variables
    const portalId = process.env.HUBSPOT_PORTAL_ID;
    const formGuid = process.env.HUBSPOT_FORM_GUID;
    const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

    if (!portalId || !formGuid || !token) {
      console.error('Missing HubSpot environment variables');
      return res.status(500).json({ ok: false, error: 'Server configuration error' });
    }

    // Build HubSpot form submission payload
    const hubspotPayload = {
      fields: [
        { objectTypeId: '0-1', name: 'firstname', value: firstname.trim() },
        { objectTypeId: '0-1', name: 'lastname', value: lastname.trim() },
        { objectTypeId: '0-1', name: 'email', value: email.trim() },
        { objectTypeId: '0-1', name: 'phone', value: phone.trim() },
      ],
      context: {
        pageUri: pageUri || '',
        pageName: 'go.yepzy.com Callback Request',
      },
    };

    // Add company if provided
    if (company && company.trim()) {
      hubspotPayload.fields.push({
        objectTypeId: '0-1',
        name: 'company',
        value: company.trim(),
      });
    }

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
      console.error('HubSpot API error:', hubspotResponse.status, errorData);
      return res.status(hubspotResponse.status).json({
        ok: false,
        error: 'Failed to submit form to HubSpot',
        details: errorData.message || 'Unknown error',
      });
    }

    // Success
    return res.status(200).json({ ok: true, message: 'Form submitted successfully' });

  } catch (error) {
    console.error('Form submission error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

