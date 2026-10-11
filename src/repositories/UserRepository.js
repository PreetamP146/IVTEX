const BaseRepository = require('./BaseRepository');
const User = require('../models/User');
const { ROLES } = require('../constants');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  findByEmail(email) {
    return this.findOne({ email: email.toLowerCase() });
  }

  findByEmailWithSecrets(email) {
    return this.findOne({ email: email.toLowerCase() }, { select: '+password +refreshTokenHash' });
  }

  findByIdWithSecrets(id) {
    return this.findById(id, { select: '+password +refreshTokenHash' });
  }

  async findTeamMemberIds(managerId) {
    const members = await this.model
      .find({ manager: managerId, role: ROLES.SALES_EXECUTIVE })
      .select('_id')
      .lean();
    return members.map((member) => member._id);
  }

  setRefreshTokenHash(id, hash) {
    return this.model.updateOne({ _id: id }, { $set: { refreshTokenHash: hash } });
  }

  clearRefreshToken(id) {
    return this.model.updateOne({ _id: id }, { $unset: { refreshTokenHash: 1 } });
  }

  recordLogin(id, hash) {
    return this.model.updateOne(
      { _id: id },
      { $set: { refreshTokenHash: hash, lastLoginAt: new Date() } }
    );
  }

  updatePassword(id, hashedPassword) {
    return this.model.updateOne(
      { _id: id },
      { $set: { password: hashedPassword }, $unset: { refreshTokenHash: 1 } }
    );
  }
}

module.exports = UserRepository;
