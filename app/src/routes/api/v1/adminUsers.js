// src/routes/api/v1/adminUsers.js
const router = require('express').Router();
const User = require('../../../models/User');
const { body, validationResult } = require('express-validator');

// GET  /api/v1/admin/users               – list users
router.get('/', async (req,res)=>{
  const users = await User.find().select('-password');
  res.json(users);
});

// POST /api/v1/admin/users               – create user
router.post('/',
  body('name').isLength({min:2}),
  body('email').isEmail(),
  body('password').isLength({min:6}),
  body('role').isIn(['user','admin','super-admin']),
async (req,res)=>{
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name,email,password,role } = req.body;
  if (await User.exists({ email })) {
    return res.status(409).json({ error:'Email already in use' });
  }
  const user = await User.create({ name,email,password:hash(password),role });
  res.status(201).json({ id:user._id, name:user.name, email:user.email, role:user.role });
});
module.exports = router;
