const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const userRoutes = require('./routes/userRoutes');
const contactRoutes = require('./routes/contactRoutes');
const { errorHandler } = require('./middleware/errorHandler');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(fileUpload());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })); // Rate limit: 100 requests per 15 mins
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Error Handling Middleware
app.use(errorHandler);

// Connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB Connected'))
    .catch((err) => console.error(err));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
