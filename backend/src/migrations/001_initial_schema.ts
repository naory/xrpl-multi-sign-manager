import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Enable UUID extension
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

  // Users table
  await queryInterface.createTable('users', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'user',
    },
    kyc_status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
    },
    kyc_verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    kyc_document_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    aml_status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
    },
    ofac_status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
    },
    risk_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    mfa_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    mfa_secret: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'active',
    },
    last_login_at: {
      type: DataTypes.DATE,
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

  // Master Keys table
  await queryInterface.createTable('master_keys', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    wallet_id: {
      type: DataTypes.UUID,
      allowNull: true, // Will be set after wallet creation
    },
    key_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    public_key: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    encrypted_private_key: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    key_derivation_path: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    backup_status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
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

  // Signing Keys table
  await queryInterface.createTable('signing_keys', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    key_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    public_key: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    encrypted_private_key: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    key_derivation_path: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    backup_status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'active',
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

  // Wallets table
  await queryInterface.createTable('wallets', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    xrpl_address: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    master_key_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'master_keys',
        key: 'id',
      },
    },
    signature_scheme: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    required_signatures: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    total_signers: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'active',
    },
    balance_xrp: {
      type: DataTypes.DECIMAL(20, 6),
      allowNull: false,
      defaultValue: 0,
    },
    balance_usd: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: false,
      defaultValue: 0,
    },
    last_balance_update: {
      type: DataTypes.DATE,
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

  // Add foreign key constraint for master_keys.wallet_id
  await queryInterface.addConstraint('master_keys', {
    fields: ['wallet_id'],
    type: 'foreign key',
    references: {
      table: 'wallets',
      field: 'id',
    },
    onDelete: 'CASCADE',
  });

  // Wallet Signers table
  await queryInterface.createTable('wallet_signers', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    wallet_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'wallets',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    signing_key_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'signing_keys',
        key: 'id',
      },
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    weight: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'active',
    },
    added_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
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

  // Sessions table
  await queryInterface.createTable('sessions', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    refresh_token_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    access_token_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    device_fingerprint: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
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

  // Create indexes
  await queryInterface.addIndex('users', ['email']);
  await queryInterface.addIndex('users', ['role']);
  await queryInterface.addIndex('users', ['status']);
  await queryInterface.addIndex('wallets', ['xrpl_address']);
  await queryInterface.addIndex('wallets', ['status']);
  await queryInterface.addIndex('wallet_signers', ['wallet_id', 'user_id'], { unique: true });
  await queryInterface.addIndex('sessions', ['user_id', 'is_active']);
  await queryInterface.addIndex('sessions', ['expires_at']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('sessions');
  await queryInterface.dropTable('wallet_signers');
  await queryInterface.dropTable('wallets');
  await queryInterface.dropTable('signing_keys');
  await queryInterface.dropTable('master_keys');
  await queryInterface.dropTable('users');
} 