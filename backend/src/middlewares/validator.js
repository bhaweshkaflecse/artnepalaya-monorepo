export const validate = (schema) => async (req, res, next) => {
  try {
    // 1. Capture the clean, parsed data from Zod
    const parsedData = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

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