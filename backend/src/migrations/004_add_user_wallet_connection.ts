import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Add user_wallet_connections table for storing verified user wallets
  await queryInterface.createTable('user_wallet_connections', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    public_address: {
      type: DataTypes.STRING(34),
      allowNull: false,
      validate: {
        len: [25, 34], // XRPL addresses are 25-34 characters
        is: /^r[a-zA-Z0-9]{24,33}$/, // XRPL address format
      },
    },
    wallet_type: {
      type: DataTypes.ENUM('ledger', 'xaman', 'xumm', 'other'),
      allowNull: true,
    },
    nickname: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    verification_signature: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    verification_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    verification_timestamp: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    connection_metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Add wallet_creation_requests table for new wallet creation workflow
  await queryInterface.createTable('wallet_creation_requests', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    wallet_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    wallet_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    network: {
      type: DataTypes.ENUM('testnet', 'mainnet', 'devnet'),
      allowNull: false,
      defaultValue: 'testnet',
    },
    signature_scheme: {
      type: DataTypes.ENUM('multi_sign', 'weighted'),
      allowNull: false,
      defaultValue: 'weighted',
    },
    quorum: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 255,
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'wallet_created', 'blackhole_pending', 'blackhole_completed', 'signers_added', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    generated_address: {
      type: DataTypes.STRING(34),
      allowNull: true,
    },
    generated_master_key: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    blackhole_transaction_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    blackhole_ledger_index: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    signer_configuration: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Add indexes for performance
  await queryInterface.addIndex('user_wallet_connections', ['user_id']);
  await queryInterface.addIndex('user_wallet_connections', ['public_address']);
  await queryInterface.addIndex('user_wallet_connections', ['user_id', 'is_primary']);
  await queryInterface.addIndex('user_wallet_connections', ['user_id', 'is_verified']);
  await queryInterface.addIndex('wallet_creation_requests', ['user_id']);
  await queryInterface.addIndex('wallet_creation_requests', ['status']);
  await queryInterface.addIndex('wallet_creation_requests', ['generated_address']);

  // Add unique constraints
  await queryInterface.addConstraint('user_wallet_connections', {
    fields: ['user_id', 'public_address'],
    type: 'unique',
    name: 'unique_user_wallet_connection',
  });

  await queryInterface.addConstraint('user_wallet_connections', {
    fields: ['user_id', 'is_primary'],
    type: 'unique',
    name: 'unique_user_primary_wallet'
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Drop tables
  await queryInterface.dropTable('user_wallet_connections');
  await queryInterface.dropTable('wallet_creation_requests');
} 