import { Model, DataTypes, UUIDV4 } from 'sequelize';
import sequelize from '../config/database';

export interface WalletImportAttributes {
  id: string;
  wallet_id: string;
  imported_by: string;
  import_method: 'address' | 'qr_code' | 'manual';
  import_metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface WalletImportCreationAttributes extends Omit<WalletImportAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class WalletImport extends Model<WalletImportAttributes, WalletImportCreationAttributes> {
  public id!: string;
  public wallet_id!: string;
  public imported_by!: string;
  public import_method!: 'address' | 'qr_code' | 'manual';
  public import_metadata?: Record<string, any>;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Virtual getters
  get importSource(): string {
    switch (this.import_method) {
      case 'address':
        return 'Manual Address Entry';
      case 'qr_code':
        return 'QR Code Scan';
      case 'manual':
        return 'Manual Configuration';
      default:
        return 'Unknown';
    }
  }

  get hasMetadata(): boolean {
    return this.import_metadata && Object.keys(this.import_metadata).length > 0;
  }
}

WalletImport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
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
  },
  {
    sequelize,
    tableName: 'wallet_imports',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['wallet_id'],
      },
      {
        fields: ['imported_by'],
      },
    ],
  }
); 