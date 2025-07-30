'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Enable UUID extension
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // Users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      role: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'user',
      },
      kyc_status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'pending',
      },
      kyc_verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      kyc_document_hash: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      aml_status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'pending',
      },
      ofac_status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'pending',
      },
      risk_score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      mfa_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      mfa_secret: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      oauth_provider: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      oauth_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      oauth_email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'active',
      },
      last_login_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['role']);
    await queryInterface.addIndex('users', ['status']);
    await queryInterface.addIndex('users', ['kyc_status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
}; 