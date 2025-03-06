import { Model, DataTypes, Sequelize, Optional } from "sequelize";

// Initialize the model
export default function (sequelize: Sequelize) {
  class AgentProxy extends Model {
    public id!: number; // Non-optional property
    public agentId: string;
    public host: string;
    public port: string;
    public username: string;
    public password: string;
    public createdAt!: Date;
    public updatedAt!: Date;

    // Define associations
    static associate(models: any) {
      // Define associations here
    }
  }

  AgentProxy.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      agentId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      host: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      port: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      password: {
        type: DataTypes.STRING,
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
      modelName: "AgentProxy",
      tableName: "agent_proxys", // Specify the table name if different
      timestamps: true, // Enable timestamps if needed
    }
  );

  return AgentProxy;
}
