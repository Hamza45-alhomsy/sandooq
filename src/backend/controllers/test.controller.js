// controllers/test.controller.js — Health check business logic

export const healthCheck = (req, res) => {
  res.json({ status: "OK", message: "Cash Flow API is running" });
};
