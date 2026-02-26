export function sendSuccess(res, { data = null, message, status = 200, meta } = {}) {
  const payload = { success: true };
  if (data !== undefined) payload.data = data;
  if (message) payload.message = message;
  if (meta) payload.meta = meta;
  return res.status(status).json(payload);
}

export function sendCreated(res, { data, message } = {}) {
  return sendSuccess(res, { status: 201, data, message });
}
