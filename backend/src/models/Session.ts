import {
  Model,
  DataTypes,
  Sequelize,
  Optional
} from 'sequelize';
import sequelize from '../config/database';

interface SessionAttributes {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  access_token_hash?: string;
  ip_address?: string;
  user_agent?: string;
  device_fingerprint?: string;
  is_active: boolean;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

interface SessionCreationAttributes extends Optional<SessionAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Session extends Model<SessionAttributes, SessionCreationAttributes> implements SessionAttributes {
  public id!: string;
  public user_id!: string;
  public refresh_token_hash!: string;
  public access_token_hash?: string;
  public ip_address?: string;
  public user_agent?: string;
  public device_fingerprint?: string;
  public is_active!: boolean;
  public expires_at!: Date;
  public created_at!: Date;
  public updated_at!: Date;

  // Virtual getter for is expired
  get isExpired(): boolean {
    return new Date() > this.expires_at;
  }

  // Virtual getter for is valid
  get isValid(): boolean {
    return this.is_active && !this.isExpired;
  }
}

Session.init(
  {
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
    tableName: 'sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id', 'is_active'],
      },
      {
        fields: ['expires_at'],
      },
      {
        fields: ['refresh_token_hash'],
      },
    ],
  }
);

export default Session; 