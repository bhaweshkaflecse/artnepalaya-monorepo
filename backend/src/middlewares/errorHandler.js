import { ZodError } from 'zod';

export const globalErrorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') console.error(`[ERROR]:`, err);

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const errorMessages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: errorMessages.replace(/^(body|query|params)\./g, '') } });
  }

  // 2. MongoDB Duplicate Key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: `Account with that ${field} already exists` } });
  }

  // 3. Custom Error Objects (e.g., Object.assign(new Error(), { status: 404 }))
  if (err.status) {
    const codeMap = { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT' };
    return res.status(err.status).json({
      success: false, 
      error: { code: codeMap[err.status] || 'ERROR', message: err.message }
    });
  }

  // 4. Fallback
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
};