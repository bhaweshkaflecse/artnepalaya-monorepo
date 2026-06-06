export const sendSuccess = (res, statusCode = 200, message = null, data = null, meta = null) => {
  const response = { success: true };
  if (message) response.message = message;
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};