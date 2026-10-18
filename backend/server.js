const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const attendanceRouter = require('./routes/attendance');
const notificationsRouter = require('./routes/notifications');
const aiRouter = require('./routes/ai');
app.use('/attendance', attendanceRouter);
app.use('/notifications', notificationsRouter);
app.use('/ai', aiRouter);

// Base route
app.get('/', (req, res) => {
  res.json({ message: "SetuGym Platform API Server Active" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
