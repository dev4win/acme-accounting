'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create Companies
    await queryInterface.bulkInsert('companies', [
      { name: 'TestCo A', createdAt: new Date(), updatedAt: new Date() },
      { name: 'TestCo B', createdAt: new Date(), updatedAt: new Date() },
      { name: 'TestCo C', createdAt: new Date(), updatedAt: new Date() }
    ], { returning: true });

    // Create Users
    await queryInterface.bulkInsert('users', [
      {
        name: 'Alice Accountant',
        role: 'accountant',
        companyId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Bob Secretary',
        role: 'corporateSecretary',
        companyId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Carol Director',
        role: 'director',
        companyId: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Dave Director',
        role: 'director',
        companyId: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Eve Director',
        role: 'director',
        companyId: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query('TRUNCATE TABLE "tickets", "users", "companies" RESTART IDENTITY CASCADE;');
  }
};
