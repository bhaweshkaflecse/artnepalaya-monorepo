import * as reportService from './report.service.js';

export const submitReport = async (req, res, next) => {
  try {
    await reportService.submitReport(req.user.id, req.body);
    res.status(201).json({ success: true, message: "Report submitted successfully" });
  } catch (err) { next(err); }
};