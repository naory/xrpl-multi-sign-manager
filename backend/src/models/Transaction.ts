import {
  Model,
  DataTypes,
  Sequelize,
  Optional
} from 'sequelize';
import sequelize from '../config/database';

interface TransactionAttributes {
  id: string;
  wallet_id: string;
  transaction_type: string;
  transaction_hash?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount?: string;
  currency?: string;
  destination_address?: string;
  source_address?: string;
  fee?: string;
  ledger_index?: number;
  validated?: boolean;
  signatures_required: number;
  signatures_received: number;
  created_by: string;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

interface TransactionCreationAttributes extends Optional<TransactionAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Transaction extends Model<TransactionAttributes, TransactionCreationAttributes> implements TransactionAttributes {
  public id!: string;
  public wallet_id!: string;
  public transaction_type!: string;
  public transaction_hash?: string;
  public status!: 'pending' | 'completed' | 'failed' | 'cancelled';
  public amount?: string;
  public currency?: string;
  public destination_address?: string;
  public source_address?: string;
  public fee?: string;
  public ledger_index?: number;
  public validated?: boolean;
  public signatures_required!: number;
  public signatures_received!: number;
  public created_by!: string;
  public expires_at?: Date;
  public created_at!: Date;
  public updated_at!: Date;

  // Virtual getter for is pending
  get isPending(): boolean {
    return this.status === 'pending';
  }

  // Virtual getter for is completed
  get isCompleted(): boolean {
    return this.status === 'completed';
  }

  // Virtual getter for is failed
  get isFailed(): boolean {
    return this.status === 'failed';
  }

  // Virtual getter for signature progress
  get signatureProgress(): number {
    return (this.signatures_received / this.signatures_required) * 100;
  }
}

Transaction.init(
  {
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
    transaction_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['payment', 'trust_set', 'account_set', 'signer_list_set', 'offer_create', 'offer_cancel']],
      },
    },
    transaction_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    amount: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    destination_address: {
      type: DataTypes.STRING(34),
      allowNull: true,
    },
    source_address: {
      type: DataTypes.STRING(34),
      allowNull: true,
    },
    fee: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    ledger_index: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    validated: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    signatures_required: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    signatures_received: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  },
  {
    sequelize,
    tableName: 'transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['wallet_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['transaction_hash'],
      },
      {
        fields: ['created_by'],
      },
    ],
  }
);

export default Transaction; 