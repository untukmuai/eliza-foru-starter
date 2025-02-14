import { Model, DataTypes, Sequelize } from "sequelize";

export default function (sequelize: Sequelize) {
  class Goals extends Model {
    public id!: string; // UUID
    public userId!: string;
    public name!: string;
    public status!: string;
    public description!: string;
    public roomId!: string;
    public objectives!: object; // JSONB
    public createdAt!: Date;

    // Define associations if needed
    static associate(models: any) {
      // Define associations here
    }
  }

  Goals.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: false,
      },
      status: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: false,
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: false,
      },
      roomId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: false,
      },
      objectives: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "Goals",
      tableName: "goals", // Ensure this matches your database table
      timestamps: true, // Enable timestamps if needed
    }
  );

  return Goals;
}
