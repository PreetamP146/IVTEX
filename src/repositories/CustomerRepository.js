const BaseRepository = require('./BaseRepository');
const Customer = require('../models/Customer');

class CustomerRepository extends BaseRepository {
  constructor() {
    super(Customer);
  }

  findByEmail(email, options) {
    return this.findOne({ email: email.toLowerCase() }, options);
  }
}

module.exports = CustomerRepository;
