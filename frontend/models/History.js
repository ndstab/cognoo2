import mongoose from 'mongoose'

const historySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
}, {
  timestamps: true
})

const Collaboration = mongoose.models.Collaboration || mongoose.model('Collaboration', collaborationSchema)

export default Collaboration 