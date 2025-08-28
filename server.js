const express = require('express');
const connectDB = require('./config/db');
const http = require("http");
const { initSocket } = require("./config/socket");

const dotenv = require('dotenv');
const cors = require('cors');

const verifyToken = require('./middlewares/auth'); // 👈 Import middleware

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json()); // for parsing application/json
const path = require('path');


const server = http.createServer(app);
initSocket(server);

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));

app.use('/api/play', require('./routes/play'));
app.use('/api/profile',verifyToken, require('./routes/profile'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

