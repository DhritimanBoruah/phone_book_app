const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const Joi = require("joi");
const multer = require("multer");
const path = require("path");

const app = express();
const port = 3000;

const usersFile = path.join(__dirname, "users.json");
const contactsFile = path.join(__dirname, "contacts.json");

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Function to read and write in JSON-------------------------------------------------------------

// Users
const readUsers = () => {
  const data = fs.readFileSync(usersFile, "utf-8");
  return JSON.parse(data);
};

const writeUsers = (users) => {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
};

// Contacts
const readContacts = () => {
  const data = fs.readFileSync(contactsFile, "utf-8");
  return JSON.parse(data);
};

const writeContacts = (contacts) => {
  fs.writeFileSync(contactsFile, JSON.stringify(contacts, null, 2));
};

// Joi validation--------------------------------------------------------------------

const registerValidation = Joi.object({
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const loginValidation = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().min(8).required(),
});

const contactValidation = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  email: Joi.string().email().required(),
  photo: Joi.optional(),
});

// Generate sequential numeric user ID 
const generateUserId = () => {
  const users = readUsers();
  const maxId = users.length > 0 ? Math.max(...users.map(user => parseInt(user.id))) : 0;
  return (maxId + 1).toString();
};

// Generate sequential numeric contact ID 
const generateContactId = () => {
  const contacts = readContacts();
  const maxId = contacts.length > 0 ? Math.max(...contacts.map(contact => parseInt(contact.id))) : 0;
  return (maxId + 1).toString();
};



// Signup
app.post("/api/auth/signup", async (req, res) => {
  const { error, value } = registerValidation.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { username, email, password } = value;
  const users = readUsers();
  const userExists = users.find(user => user.username === username);
  if (userExists) {
    return res.status(400).json({ message: 'Username already exists!' });
  }

  const hashedPassword = bcrypt.hashSync(password, 8);
  const newUser = {
    id: generateUserId(),
    username: value.username,
    password: hashedPassword,
    email: value.email
  };
  users.push(newUser);
  writeUsers(users);
  res.status(201).json({ message: 'User registered successfully!' });
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { error, value } = loginValidation.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { username, password } = value;
  const users = readUsers();
  const user = users.find(user => user.username === username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, 'secret_jwt_key', { expiresIn: '1h' });
  res.json({ token });
});

// Middleware to check authentication
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access Denied' });

  jwt.verify(token, 'secret_jwt_key', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid Token' });
    req.user = user;
    next();
  });
};

// Configure multer for file upload-------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Create contact--------------------------------------------------------------------------------------------------
app.post('/api/contacts', authenticateToken, upload.single('photo'), (req, res) => {
  const { name, email, phone } = req.body;
  console.log('Request body:', req.body);
  console.log('File:', req.file);
  const contacts = readContacts();
  const newContact = {
    id: generateContactId(),
    userId: req.user.id,
    name: name,
    email: email,
    phone: phone,
    photo: req.file ? `${req.file.filename}` : null,
  };
  contacts.push(newContact);
  console.log('New contact:', newContact);
  writeContacts(contacts);
  res.status(201).json({ message: 'Contact created successfully!' });
});


// Get contacts
app.get('/api/contacts', authenticateToken, (req, res) => {
  const contacts = readContacts();
  const userContacts = contacts.filter(contact => contact.userId === req.user.id);
  res.json(userContacts);
});


// Get a specific contact by ID
app.get('/api/contacts/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const contacts = readContacts();
  const contact = contacts.find(contact => contact.id === id && contact.userId === req.user.id);

  if (!contact) {
    return res.status(404).json({ message: 'Contact not found' });
  }

  res.json(contact);
});



//update

app.put('/api/contacts/:id', authenticateToken, upload.single('photo'), (req, res) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  const photo = req.file ? req.file.filename : null;

  // Validate contact details
  const { error } = contactValidation.validate({ name, email, phone });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const contacts = readContacts();
  const contactIndex = contacts.findIndex(contact => contact.id === id && contact.userId === req.user.id);

  if (contactIndex === -1) {
    return res.status(404).json({ message: 'Contact not found' });
  }

  // Update contact details
  contacts[contactIndex] = {
    ...contacts[contactIndex],
    name,
    email,
    phone,
    photo: photo || contacts[contactIndex].photo
  };

  writeContacts(contacts);
  res.status(200).json({ message: 'Contact updated successfully!' });
});










//delete

app.delete('/api/contacts/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  console.log(`Request to delete contact with ID: ${id}`);

  const contacts = readContacts();
  const contactIndex = contacts.findIndex(contact => contact.id === id && contact.userId === req.user.id);

  if (contactIndex === -1) {
    console.log(`Contact with ID ${id} not found or does not belong to the user.`);
    return res.status(404).json({ message: 'Contact not found' });
  }

  // Optionally delete the photo file from the server
  const contact = contacts[contactIndex];
  if (contact.photo) {
    fs.unlink(path.join('uploads', contact.photo), (err) => {
      if (err) console.error(`Error deleting photo file: ${err}`);
    });
  }

  contacts.splice(contactIndex, 1);
  writeContacts(contacts);

  res.status(200).json({ message: 'Contact deleted successfully!' });
});







// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
