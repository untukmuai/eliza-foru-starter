import { Model, DataTypes, Sequelize, Optional } from "sequelize";

// Initialize the model
export default function (sequelize: Sequelize) {
  class CharacterConfig extends Model {
    public id!: number; // Non-optional property
    public name!: string;
    public character!: object;

    // Define associations
    static associate(models: any) {
      // Define associations here
    }
  }

  CharacterConfig.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      character: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "CharacterConfig",
      tableName: "character_configs", // Specify the table name if different
      timestamps: true, // Enable timestamps if needed
    }
  );

  return CharacterConfig;
}
