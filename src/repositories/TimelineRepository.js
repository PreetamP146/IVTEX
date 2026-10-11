const BaseRepository = require('./BaseRepository');
const Timeline = require('../models/Timeline');

class TimelineRepository extends BaseRepository {
  constructor() {
    super(Timeline);
  }
}

module.exports = TimelineRepository;
