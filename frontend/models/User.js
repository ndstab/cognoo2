import mongoose from 'mongoose'

// Check if the model is already defined to prevent recompilation
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
  },
}, {
  timestamps: true
})

// Check if the model exists before creating it
const User = mongoose.models.User || mongoose.model('User', UserSchema)

export default User
