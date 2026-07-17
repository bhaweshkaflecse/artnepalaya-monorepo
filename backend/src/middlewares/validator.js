export const validate = (schema) => async (req, res, next) => {
  try {
    // Debug: log raw req.body BEFORE Zod processes it
    if (req.originalUrl.includes('/posts') && req.method === 'POST') {
      console.log('[VALIDATOR] PRE-ZOD req.body keys:', Object.keys(req.body));
      console.log('[VALIDATOR] PRE-ZOD req.body.artworkType:', JSON.stringify(req.body.artworkType), '| typeof:', typeof req.body.artworkType);
    }

    // 1. Capture the clean, parsed data from Zod
    const parsedData = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Debug: log AFTER Zod processes it
    if (req.originalUrl.includes('/posts') && req.method === 'POST') {
      console.log('[VALIDATOR] POST-ZOD parsedData.body.artworkType:', JSON.stringify(parsedData.body?.artworkType), '| typeof:', typeof parsedData.body?.artworkType);
    }

    // 2. Overwrite the raw request with the clean data!
    req.body = parsedData.body;
    req.query = parsedData.query;
    req.params = parsedData.params;

    next();
  } catch (error) {
    // (Keep your existing error handling code here)
    const formattedErrors = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: formattedErrors }
    });
  }
};