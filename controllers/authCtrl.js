const { User, registerValidation, loginValidation } = require("../models/User");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");

/**----------------------------------------------------------
 * @desc    Register new user
 * @route   /api/auth/register
 * @access  public
 * @method  POST
 ----------------------------------------------------------*/
module.exports.register = asyncHandler(async (req, res) => {
  const { error } = registerValidation(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const [userExist, hashedPassword] = await Promise.all([
    User.findOne({ email: req.body.email }),
    bcrypt.hash(req.body.password, 10),
  ]);

  if (userExist) {
    return res.status(400).json({ message: "User already exists" });
  }
  const userData = {
    name: req.body.name,
    email: req.body.email,
    password: hashedPassword,
    playerId: req.body.playerId ? req.body.playerId : null,
  };

  await User.create(userData);

  res.status(201).json({
    message: `Welcome ${req.body.name}, please login to complete registration.`,
  });
});

/**------------------------------------------------------------
 * @desc    Login user
 * @route   /api/auth/login
 * @access  public
 * @method  POST
 */
module.exports.login = asyncHandler(async (req, res) => {
  const { error } = loginValidation(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(400).json({ message: "Invalid email or password" });
  }
  const validPassword = bcrypt.compareSync(req.body.password, user.password);
  if (!validPassword) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  res.status(200).json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
    token: user.generateToken(),
    message: "User logged in successfully",
  });
});
