export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phrase, hebrew, english, simple, aiqBekar } = req.body;

    if (!phrase || typeof phrase !== 'string') {
      return res.status(400).json({ error: 'Phrase is required' });
    }

    // Sanitize the phrase
    const sanitizedPhrase = phrase.slice(0, 200).replace(/[<>]/g, '');

    // Check if Anthropic API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      // Return a fallback interpretation if no API key
      return res.status(200).json({
        interpretation: `The phrase "${sanitizedPhrase}" carries gematria values of ${hebrew}/${english}/${simple}${aiqBekar ? `/${aiqBekar}` : ''}, suggesting numerological significance across multiple calculation systems.`,
        fallback: true
      });
    }

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `You are a mystical interpreter of gematria phrases. Given a phrase and its gematria values, provide a brief, evocative 2-3 sentence interpretation that explores the symbolic or spiritual meaning the phrase might hold. Be creative, poetic, and intriguing. Do not explain what gematria is or how it works - just interpret the phrase.

Phrase: "${sanitizedPhrase}"
Hebrew Gematria: ${hebrew}
English Gematria: ${english}
Simple Gematria: ${simple}${aiqBekar ? `\nAik Bekar Gematria: ${aiqBekar}` : ''}

Provide your interpretation directly without any preamble or explanation of gematria.`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      // Return fallback on error
      return res.status(200).json({
        interpretation: `The phrase "${sanitizedPhrase}" resonates with the numeric vibrations of ${hebrew}/${english}/${simple}, weaving together ancient wisdom and modern meaning.`,
        fallback: true
      });
    }

    const data = await response.json();
    const interpretation = data.content?.[0]?.text || 'Unable to generate interpretation.';

    return res.status(200).json({
      interpretation,
      fallback: false
    });
  } catch (error) {
    console.error('Interpretation error:', error);
    // Return fallback on any error
    return res.status(200).json({
      interpretation: 'The mystic energies of this phrase await deeper contemplation.',
      fallback: true
    });
  }
}
