export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phrase, hebrew, english, simple } = req.body;

    // Verify this is a 666/666/111 match
    if (hebrew !== 666 || english !== 666 || simple !== 111) {
      return res.status(400).json({ error: 'Not a valid 666/666/111 match' });
    }

    // Send email using Resend API (free tier available)
    const emailData = {
      from: 'Gematria Generator <onboarding@resend.dev>',
      to: ['petebunke@gmail.com'],
      subject: '🎯 666/666/111 Match Found!',
      html: `
        <h2>A user found a 666/666/111 match!</h2>
        <p><strong>Phrase:</strong> "${phrase}"</p>
        <ul>
          <li><strong>Hebrew Gematria:</strong> ${hebrew}</li>
          <li><strong>English Gematria:</strong> ${english}</li>
          <li><strong>Simple Gematria:</strong> ${simple}</li>
        </ul>
        <p><em>Generated at ${new Date().toISOString()}</em></p>
      `,
    };

    // Use Resend API if key is available
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        console.error('Resend API error:', await response.text());
        // Don't fail - just log and return success
      }
    } else {
      // Log to console if no API key (for development)
      console.log('📧 Would send email:', emailData);
    }

    // Always return success to avoid revealing information to client
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Notification error:', error);
    // Return success anyway to avoid client-side errors
    return res.status(200).json({ success: true });
  }
}
