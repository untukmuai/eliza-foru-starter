import { Model, DataTypes, Sequelize } from "sequelize";

export default function (sequelize: Sequelize) {
  class Accounts extends Model {
    public id!: string; // UUID
    public username!: string;
    public email!: string;
    public profile!: object; // JSONB
    public createdAt!: Date;
    public updatedAt!: Date;

    // Define associations if needed
    static associate(models: any) {
      // Define associations here
    }
  }

  Accounts.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      profile: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "Accounts",
      tableName: "accounts", // Ensure this matches your database table
      timestamps: true, // Enable timestamps if needed
    }
  );

  return Accounts;
}
