import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Add OAuth fields to users table
  await queryInterface.addColumn('users', 'oauth_provider', {
    type: DataTypes.STRING(50),
    allowNull: true,
  });

  await queryInterface.addColumn('users', 'oauth_id', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });

  await queryInterface.addColumn('users', 'oauth_email', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });

  // Add indexes for OAuth fields
  await queryInterface.addIndex('users', ['oauth_provider', 'oauth_id'], {
    unique: true,
    where: {
      oauth_provider: { [require('sequelize').Op.not]: null },
      oauth_id: { [require('sequelize').Op.not]: null }
    }
  });

  await queryInterface.addIndex('users', ['oauth_email']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Remove indexes
  await queryInterface.removeIndex('users', ['oauth_provider', 'oauth_id']);
  await queryInterface.removeIndex('users', ['oauth_email']);

  // Remove OAuth columns
  await queryInterface.removeColumn('users', 'oauth_provider');
  await queryInterface.removeColumn('users', 'oauth_id');
  await queryInterface.removeColumn('users', 'oauth_email');
} 