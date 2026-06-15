import { User } from '../../models/index.js'
import { AppError } from '../../utils/errors.js'

export const userService = {
  async findById(id: string) {
    const user = await User.findById(id)
    if (!user) throw new AppError('User not found', 'NOT_FOUND', 404)
    return user
  },

  async findByEmail(email: string) {
    return User.findOne({ email: email.toLowerCase() })
  },

  async listAgents() {
    return User.find({ role: { $in: ['agent', 'manager'] } }).select('-password')
  },
}
