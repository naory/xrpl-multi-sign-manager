import {
  Model,
  DataTypes,
  Sequelize,
  Optional
} from 'sequelize';
import sequelize from '../config/database';
import * as bcrypt from 'bcrypt';

interface UserAttributes {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  kyc_status: string;
  kyc_verified_at?: Date;
  kyc_document_hash?: string;
  aml_status: string;
  ofac_status: string;
  risk_score: number;
  mfa_enabled: boolean;
  mfa_secret?: string;
  oauth_provider?: string;
  oauth_id?: string;
  oauth_email?: string;
  status: string;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'created_at' | 'updated_at'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public password_hash!: string;
  public first_name!: string;
  public last_name!: string;
  public phone?: string;
  public role!: string;
  public kyc_status!: string;
  public kyc_verified_at?: Date;
  public kyc_document_hash?: string;
  public aml_status!: string;
  public ofac_status!: string;
  public risk_score!: number;
  public mfa_enabled!: boolean;
  public mfa_secret?: string;
  public oauth_provider?: string;
  public oauth_id?: string;
  public oauth_email?: string;
  public status!: string;
  public last_login_at?: Date;
  public created_at!: Date;
  public updated_at!: Date;

  // Instance methods
  async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password_hash);
  }

  async hashPassword(password: string): Promise<void> {
    this.password_hash = await bcrypt.hash(password, 12);
  }

  // Virtual getter for full name
  get fullName(): string {
    return `${this.first_name} ${this.last_name}`;
  }

  // Virtual getter for is active
  get isActive(): boolean {
    return this.status === 'active';
  }

  // Virtual getter for is verified
  get isVerified(): boolean {
    return this.kyc_status === 'verified';
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
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
      validate: {
        isIn: [['super_admin', 'admin', 'wallet_owner', 'signer', 'viewer', 'user']],
      },
    },
    kyc_status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'verified', 'rejected', 'expired']],
      },
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
      validate: {
        isIn: [['pending', 'passed', 'failed', 'review']],
      },
    },
    ofac_status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'clear', 'blocked', 'review']],
      },
    },
    risk_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
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
    oauth_provider: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        isIn: [['google', 'apple', null]],
      },
    },
    oauth_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    oauth_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'inactive', 'suspended', 'deleted']],
      },
    },
    last_login_at: {
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
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['email'],
      },
      {
        fields: ['role'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['kyc_status'],
      },
    ],
  }
);

export default User; 