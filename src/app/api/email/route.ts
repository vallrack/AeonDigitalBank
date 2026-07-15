import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, type, data } = body;

    if (!to || !to.email || !type || !data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    
    if (!BREVO_API_KEY) {
      console.warn("BREVO_API_KEY no está configurada en .env. El correo no se enviará.");
      // Devolvemos 200 en local para que la app no falle si no hay API key, pero avisamos.
      return NextResponse.json({ success: true, warning: 'No API Key configured' });
    }

    const sender = {
      name: "Bank of Americans",
      email: "no-reply@bankofamericans.com" // Brevo account must have this verified or it might fail, we'll warn user
    };

    let subject = '';
    let htmlContent = '';

    const formattedAmount = `$${Number(data.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const baseStyles = `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
      .header { background-color: #1e293b; padding: 24px; text-align: center; }
      .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
      .content { padding: 32px 24px; color: #334155; line-height: 1.6; }
      .amount { font-size: 36px; font-weight: bold; margin: 16px 0; text-align: center; }
      .amount.green { color: #10b981; }
      .amount.red { color: #e11d48; }
      .amount.yellow { color: #f59e0b; }
      .details { background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0; }
      .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
      .detail-label { color: #64748b; }
      .detail-value { font-weight: 600; color: #0f172a; }
      .footer { background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; }
    `;

    if (type === 'receipt') {
      subject = `Comprobante de transferencia - ${formattedAmount}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><style>${baseStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bank of Americans</h1>
            </div>
            <div class="content">
              <p>Hola ${to.name},</p>
              <p>Tu transferencia se ha realizado con éxito.</p>
              <div class="amount red">-${formattedAmount}</div>
              <div class="details">
                <div class="detail-row"><span class="detail-label">Enviado a:</span> <span class="detail-value">${data.receiverName}</span></div>
                <div class="detail-row"><span class="detail-label">Fecha:</span> <span class="detail-value">${new Date(data.date).toLocaleString()}</span></div>
                <div class="detail-row"><span class="detail-label">Referencia:</span> <span class="detail-value">${data.reference}</span></div>
              </div>
              <p>Gracias por confiar en nosotros.</p>
            </div>
            <div class="footer">
              Este es un correo automático. Por favor no respondas a este mensaje.
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'received') {
      subject = `Has recibido una transferencia de ${formattedAmount}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><style>${baseStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bank of Americans</h1>
            </div>
            <div class="content">
              <p>¡Hola ${to.name}!</p>
              <p>Tienes nuevos fondos disponibles en tu cuenta.</p>
              <div class="amount green">+${formattedAmount}</div>
              <div class="details">
                <div class="detail-row"><span class="detail-label">Enviado por:</span> <span class="detail-value">${data.senderName}</span></div>
                <div class="detail-row"><span class="detail-label">Fecha:</span> <span class="detail-value">${new Date(data.date).toLocaleString()}</span></div>
                <div class="detail-row"><span class="detail-label">Referencia:</span> <span class="detail-value">${data.reference}</span></div>
              </div>
              <p>El dinero ya está disponible en tu cuenta.</p>
            </div>
            <div class="footer">
              Este es un correo automático. Por favor no respondas a este mensaje.
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'held') {
      subject = `Transacción retenida por revisión de seguridad`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><style>${baseStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bank of Americans - Seguridad</h1>
            </div>
            <div class="content">
              <p>Hola ${to.name},</p>
              <p>Tu intento de transferencia ha sido retenido temporalmente por nuestros sistemas de seguridad automatizados, ya que supera los límites habituales.</p>
              <div class="amount yellow">${formattedAmount}</div>
              <div class="details">
                <div class="detail-row"><span class="detail-label">Destinatario:</span> <span class="detail-value">${data.receiverName}</span></div>
                <div class="detail-row"><span class="detail-label">Estado:</span> <span class="detail-value">En Revisión</span></div>
                <div class="detail-row"><span class="detail-label">Referencia:</span> <span class="detail-value">${data.reference}</span></div>
              </div>
              <p>Nuestro equipo de fraudes está revisando la transacción. Te notificaremos una vez sea aprobada o rechazada.</p>
            </div>
            <div class="footer">
              Bank of Americans - Departamento de Prevención de Fraudes
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'welcome') {
      subject = `¡Bienvenido a Bank of Americans! Tu cuenta está activa`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><style>${baseStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bank of Americans</h1>
            </div>
            <div class="content">
              <p>Hola ${to.name},</p>
              <p>¡Tenemos excelentes noticias! Tu cuenta ha superado nuestro proceso de verificación de seguridad y ha sido <strong>activada exitosamente</strong>.</p>
              <div class="amount green">Cuenta Activa</div>
              <div class="details">
                <div class="detail-row"><span class="detail-label">Fecha de activación:</span> <span class="detail-value">${data.activationDate ? new Date(data.activationDate).toLocaleString() : new Date().toLocaleString()}</span></div>
                <div class="detail-row"><span class="detail-label">Estado:</span> <span class="detail-value">Aprobada</span></div>
              </div>
              <p>Ya puedes iniciar sesión, solicitar tarjetas virtuales y comenzar a realizar transferencias seguras en nuestra plataforma.</p>
            </div>
            <div class="footer">
              El equipo de Bank of Americans te da la bienvenida.
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'deposit') {
      subject = `Depósito recibido: +${formattedAmount} en tu cuenta`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><style>${baseStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bank of Americans</h1>
            </div>
            <div class="content">
              <p>¡Hola ${to.name}!</p>
              <p>Se ha acreditado un depósito en tu cuenta.</p>
              <div class="amount green">+${formattedAmount}</div>
              <div class="details">
                <div class="detail-row"><span class="detail-label">Cuenta:</span> <span class="detail-value">${data.account || 'Cuenta'}</span></div>
                <div class="detail-row"><span class="detail-label">Fecha:</span> <span class="detail-value">${data.date ? new Date(data.date).toLocaleString() : new Date().toLocaleString()}</span></div>
                <div class="detail-row"><span class="detail-label">Estado:</span> <span class="detail-value">Acreditado</span></div>
              </div>
              <p>Los fondos ya están disponibles en tu cuenta Bank of Americans.</p>
            </div>
            <div class="footer">
              Este es un correo automático. Por favor no respondas a este mensaje.
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'pending') {
      subject = `Tu solicitud de cuenta está en revisión - Bank of Americans`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><style>${baseStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bank of Americans</h1>
            </div>
            <div class="content">
              <p>Hola ${to.name},</p>
              <p>Hemos recibido tu solicitud de registro y tus documentos están siendo verificados por nuestro equipo de seguridad.</p>
              <div class="amount yellow">En Revisión</div>
              <div class="details">
                <div class="detail-row"><span class="detail-label">Estado:</span> <span class="detail-value">Pendiente de verificación</span></div>
                <div class="detail-row"><span class="detail-label">Tiempo estimado:</span> <span class="detail-value">Hasta 6 horas</span></div>
              </div>
              <p>Una vez que tu cuenta sea activada, recibirás un correo de confirmación y podrás acceder a todos los servicios de Bank of Americans.</p>
            </div>
            <div class="footer">
              El equipo de Bank of Americans.
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const brevoPayload = {
      sender,
      to: [to],
      subject,
      htmlContent
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
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
      console.error('Brevo API Error:', errorData);
      return NextResponse.json({ error: 'Failed to send email', details: errorData }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json({ success: true, messageId: result.messageId });

  } catch (error: any) {
    console.error('Email API Exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
