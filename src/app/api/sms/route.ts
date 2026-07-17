import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phoneNumber, otpCode } = body;

    if (!phoneNumber || !otpCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    
    if (!BREVO_API_KEY) {
      console.warn("BREVO_API_KEY no está configurada en .env. El SMS no se enviará.");
      return NextResponse.json({ success: true, warning: 'No API Key configured' });
    }

    // Brevo requires the sender to be alphanumeric, max 11 characters
    const sender = "AeonBank"; 

    // Formatting phone number slightly: Brevo requires country code + number.
    // Assuming the user typed '+52 123 456' we should strip spaces.
    const cleanPhone = phoneNumber.replace(/\s+/g, '');

    const brevoPayload = {
      type: "transactional",
      sender: sender,
      recipient: cleanPhone,
      content: `Tu código de seguridad de Aeon Digital Bank es: ${otpCode}. No lo compartas con nadie.`
    };

    const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify(brevoPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo SMS API Error:', errorData);
      return NextResponse.json({ error: 'Failed to send SMS', details: errorData }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json({ success: true, messageId: result.messageId });

  } catch (error: any) {
    console.error('SMS API Exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
