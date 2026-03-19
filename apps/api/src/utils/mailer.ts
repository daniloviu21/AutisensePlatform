import * as postmark from "postmark";

// ─── Client ───────────────────────────────────────────────────────────────────

const client = new postmark.ServerClient(
  process.env.POSTMARK_SERVER_TOKEN ?? ""
);

const FROM_ADDRESS =
  process.env.POSTMARK_FROM ?? "AutiSense <20233l001166@utcv.edu.mx>";

const MFA_TTL_MIN = Number(process.env.MFA_CODE_TTL_MINUTES ?? process.env.MFA_OTP_TTL_MIN ?? 10);

// ─── Plantilla HTML ───────────────────────────────────────────────────────────

function mfaTemplate(code: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width" />
  <title>Tu código de verificación</title>
</head>
<body style="margin:0;padding:0;background:#F6FAFF;font-family:system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr>
      <td>
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2A9D8F,#457B9D);padding:32px 40px 24px">
              <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.02em">AutiSense</p>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.75)">Plataforma clínica</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px">
              <p style="margin:0 0 8px;font-size:16px;color:#111;font-weight:600">Tu código de verificación</p>
              <p style="margin:0 0 28px;font-size:14px;color:#555;line-height:1.6">
                Ingresa el siguiente código en la pantalla de verificación. 
                Expira en <strong>${MFA_TTL_MIN} minutos</strong>.
              </p>
              <!-- OTP box -->
              <div style="background:#F0FBF9;border:2px solid #2A9D8F;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px">
                <span style="font-size:42px;font-weight:800;letter-spacing:0.25em;color:#2A9D8F;font-variant-numeric:tabular-nums">${code}</span>
              </div>
              <p style="margin:0;font-size:13px;color:#888;line-height:1.6">
                Si no solicitaste este código, ignora este mensaje. Tu cuenta permanece segura.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #F0F0F0">
              <p style="margin:0;font-size:12px;color:#aaa;text-align:center">
                © ${new Date().getFullYear()} AutiSense — Plataforma clínica
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Envía el código OTP al correo indicado a través de Postmark.
 * Lanza excepción si el envío falla para que el endpoint pueda devolver 500.
 */
export async function sendMfaCode(to: string, code: string): Promise<void> {
  try {
    await client.sendEmail({
      From: FROM_ADDRESS,
      To: to,
      Subject: "Tu código de verificación — AutiSense",
      HtmlBody: mfaTemplate(code),
      TextBody: `Tu código de verificación de AutiSense es: ${code}\nExpira en ${MFA_TTL_MIN} minutos.\nSi no solicitaste este código, ignora este mensaje.`,
      MessageStream: "outbound",
    });
  } catch (err) {
    // Log sin exponer datos sensibles
    console.error("[mailer] Error enviando correo MFA via Postmark:", (err as Error).message);
    throw err; // Re-lanza para que el endpoint devuelva 500
  }
}
