import type { APIRoute } from 'astro';

export const prerender = false;

const json = (body: Record<string, string | boolean>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

const normalize = (value: FormDataEntryValue | null) =>
  typeof value === 'string' ? value.trim() : '';

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const POST = (async ({ request }) => {
  const resendApiKey = import.meta.env.RESEND_API_KEY;
  const contactToEmail = import.meta.env.CONTACT_TO_EMAIL;
  const contactFromEmail = import.meta.env.CONTACT_FROM_EMAIL;

  if (!resendApiKey || !contactToEmail || !contactFromEmail) {
    return json(
      {
        ok: false,
        message: 'Falta configurar las variables de entorno del formulario.',
      },
      500,
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return json(
      {
        ok: false,
        message: 'No se pudo leer la informacion enviada.',
      },
      400,
    );
  }

  const nombre = normalize(formData.get('nombre'));
  const correo = normalize(formData.get('correo'));
  const telefono = normalize(formData.get('telefono'));
  const mensaje = normalize(formData.get('mensaje'));
  const servicios = formData
    .getAll('servicios')
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);

  if (!nombre || !correo) {
    return json(
      {
        ok: false,
        message: 'Nombre y correo son obligatorios.',
      },
      400,
    );
  }

  if (!isValidEmail(correo)) {
    return json(
      {
        ok: false,
        message: 'Ingresa un correo valido.',
      },
      400,
    );
  }

  const submittedAt = new Date().toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  });

  const safeNombre = escapeHtml(nombre);
  const safeCorreo = escapeHtml(correo);
  const safeTelefono = escapeHtml(telefono || 'No compartido');
  const safeMensaje = escapeHtml(mensaje || 'Sin mensaje adicional').replaceAll('\n', '<br />');
  const safeServicios = servicios.length
    ? `<ul>${servicios.map((servicio) => `<li>${escapeHtml(servicio)}</li>`).join('')}</ul>`
    : '<p>No selecciono servicios.</p>';

  const textServicios = servicios.length ? servicios.join(', ') : 'No selecciono servicios.';
  const textMensaje = mensaje || 'Sin mensaje adicional';

  let resendResponse: Response;

  try {
    resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: contactFromEmail,
        to: [contactToEmail],
        subject: `Nuevo contacto web: ${nombre}`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
            <h2 style="margin-bottom:16px;">Nuevo mensaje desde el formulario web</h2>
            <p><strong>Fecha:</strong> ${escapeHtml(submittedAt)}</p>
            <p><strong>Nombre:</strong> ${safeNombre}</p>
            <p><strong>Correo:</strong> ${safeCorreo}</p>
            <p><strong>Telefono:</strong> ${safeTelefono}</p>
            <div>
              <strong>Servicios:</strong>
              ${safeServicios}
            </div>
            <div style="margin-top:16px;">
              <strong>Mensaje:</strong>
              <p>${safeMensaje}</p>
            </div>
          </div>
        `,
        text: [
          'Nuevo mensaje desde el formulario web',
          `Fecha: ${submittedAt}`,
          `Nombre: ${nombre}`,
          `Correo: ${correo}`,
          `Telefono: ${telefono || 'No compartido'}`,
          `Servicios: ${textServicios}`,
          'Mensaje:',
          textMensaje,
        ].join('\n'),
      }),
    });
  } catch {
    return json(
      {
        ok: false,
        message: 'No se pudo conectar con el servicio de correo.',
      },
      502,
    );
  }

  if (!resendResponse.ok) {
    let errorMessage = 'No se pudo enviar el correo.';

    try {
      const resendError = await resendResponse.json();
      if (typeof resendError?.message === 'string' && resendError.message.trim()) {
        errorMessage = resendError.message.trim();
      }
    } catch {
      // Keep the default message when Resend does not return JSON.
    }

    return json(
      {
        ok: false,
        message: errorMessage,
      },
      502,
    );
  }

  return json({
    ok: true,
    message: 'Mensaje enviado. Te contactaremos pronto.',
  });
}) satisfies APIRoute;
