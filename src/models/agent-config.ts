import { Model, DataTypes, Sequelize, Optional } from "sequelize";

export default function (sequelize: Sequelize) {
  class AgentConfig extends Model {
    public id!: number;
    public agent_id!: string;
    public config_key!: string;
    public config_value!: object;

    static associate(models: any) {}
  }

  AgentConfig.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      agent_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      config_key: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      config_value: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "AgentConfig",
      tableName: "agent_configs",
      timestamps: true,
    }
  );

  return AgentConfig;
}
