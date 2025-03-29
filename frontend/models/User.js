import mongoose from 'mongoose'

// Check if the model is already defined to prevent recompilation
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: function() { return this.provider === 'credentials'; },
    minlength: [6, 'Password must be at least 6 characters long']
  },
  provider: {
    type: String,
    required: true,
    default: 'credentials'
  }
}, {
  timestamps: true
})

// Check if the model exists before creating it
const User = mongoose.models.User || mongoose.model('User', UserSchema)

export default User
