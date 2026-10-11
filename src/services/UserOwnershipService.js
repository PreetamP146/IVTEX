class UserOwnershipService {
  constructor({ leadRepository, customerRepository, dealRepository, activityRepository }) {
    this.repositories = [leadRepository, customerRepository, dealRepository, activityRepository];
  }

  async hasLinkedRecords(userId) {
    const checks = await Promise.all(
      this.repositories.map((repository) => repository.exists({ assignedTo: userId }))
    );
    return checks.some(Boolean);
  }
}

module.exports = UserOwnershipService;
