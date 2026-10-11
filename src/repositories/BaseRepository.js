class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data, { session } = {}) {
    const [document] = await this.model.create([data], { session });
    return document;
  }

  async createMany(items, { session } = {}) {
    return this.model.create(items, { session, ordered: true });
  }

  findById(id, { session, populate, select } = {}) {
    return this.#applyOptions(this.model.findById(id), { session, populate, select });
  }

  findOne(filter, { session, populate, select } = {}) {
    return this.#applyOptions(this.model.findOne(filter), { session, populate, select });
  }

  findMany(filter, { session, populate, select, sort, limit } = {}) {
    const query = this.#applyOptions(this.model.find(filter), { session, populate, select });
    if (sort) {
      query.sort(sort);
    }
    if (limit) {
      query.limit(limit);
    }
    return query;
  }

  async paginate(filter, { page, limit, sort, populate, select }) {
    const query = this.#applyOptions(
      this.model
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      { populate, select }
    );
    const [items, totalRecords] = await Promise.all([query, this.model.countDocuments(filter)]);
    return {
      items,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    };
  }

  updateById(id, update, { session, populate } = {}) {
    return this.#applyOptions(
      this.model.findByIdAndUpdate(id, update, { new: true, runValidators: true }),
      { session, populate }
    );
  }

  deleteById(id, { session } = {}) {
    return this.model.findByIdAndDelete(id, { session }).lean();
  }

  count(filter = {}) {
    return this.model.countDocuments(filter);
  }

  async exists(filter) {
    return (await this.model.exists(filter)) !== null;
  }

  aggregate(pipeline) {
    return this.model.aggregate(pipeline);
  }

  #applyOptions(query, { session, populate, select }) {
    query.lean();
    if (session) {
      query.session(session);
    }
    if (populate) {
      query.populate(populate);
    }
    if (select) {
      query.select(select);
    }
    return query;
  }
}

module.exports = BaseRepository;
