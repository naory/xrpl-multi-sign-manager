import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Drop tables that store private keys
  await queryInterface.dropTable('master_keys');
  await queryInterface.dropTable('signing_keys');

  // Add external_signers table for managing signers by public address
  await queryInterface.createTable('external_signers', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    wallet_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'wallets',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    public_address: {
      type: DataTypes.STRING(34), // XRPL addresses are 25-34 characters
      allowNull: false,
    },
    weight: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    nickname: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    wallet_type: {
      type: DataTypes.ENUM('ledger', 'xaman', 'xumm', 'other'),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    added_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
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

  // Add wallet_imports table for imported multi-sig wallets
  await queryInterface.createTable('wallet_imports', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    wallet_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'wallets',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    imported_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    import_method: {
      type: DataTypes.ENUM('address', 'qr_code', 'manual'),
      allowNull: false,
    },
    import_metadata: {
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

  // Update wallets table to remove private key references
  await queryInterface.removeColumn('wallets', 'master_key_id');
  await queryInterface.removeColumn('wallets', 'private_key_encrypted');

  // Add new columns for imported wallets
  await queryInterface.addColumn('wallets', 'is_imported', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await queryInterface.addColumn('wallets', 'import_verified', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  // Update wallet_signers table to reference external_signers
  await queryInterface.removeColumn('wallet_signers', 'signing_key_id');
  await queryInterface.addColumn('wallet_signers', 'external_signer_id', {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'external_signers',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  });

  // Add indexes for performance
  await queryInterface.addIndex('external_signers', ['wallet_id']);
  await queryInterface.addIndex('external_signers', ['public_address']);
  await queryInterface.addIndex('external_signers', ['wallet_id', 'is_active']);
  await queryInterface.addIndex('wallet_imports', ['wallet_id']);
  await queryInterface.addIndex('wallet_imports', ['imported_by']);

  // Add unique constraint for wallet_id + public_address combination
  await queryInterface.addConstraint('external_signers', {
    fields: ['wallet_id', 'public_address'],
    type: 'unique',
    name: 'unique_wallet_signer_address',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Recreate master_keys table
  await queryInterface.createTable('master_keys', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    wallet_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'wallets',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    private_key_encrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    encryption_iv: {
      type: DataTypes.TEXT,
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

  // Recreate signing_keys table
  await queryInterface.createTable('signing_keys', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    wallet_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'wallets',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
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
    private_key_encrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    encryption_iv: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    public_address: {
      type: DataTypes.STRING(34),
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

  // Drop new tables
  await queryInterface.dropTable('external_signers');
  await queryInterface.dropTable('wallet_imports');

  // Restore original wallet columns
  await queryInterface.addColumn('wallets', 'master_key_id', {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'master_keys',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  });

  await queryInterface.addColumn('wallets', 'private_key_encrypted', {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  // Remove new wallet columns
  await queryInterface.removeColumn('wallets', 'is_imported');
  await queryInterface.removeColumn('wallets', 'import_verified');

  // Restore original wallet_signers columns
  await queryInterface.addColumn('wallet_signers', 'signing_key_id', {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'signing_keys',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  });

  await queryInterface.removeColumn('wallet_signers', 'external_signer_id');
} 