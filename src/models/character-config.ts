import { Model, DataTypes, Sequelize, Optional } from "sequelize";

// Define the attributes of the CharacterConfig model  
interface CharacterConfigAttributes {  
  id?: number; // Optional if you are using auto-increment  
  name: string;  
  character: object; // Use 'object' or define a more specific type if needed  
}  
  
// Define the creation attributes (for creating a new instance)  
interface CharacterConfigCreationAttributes extends Optional<CharacterConfigAttributes, 'id'> {} 
// Extend the Model class with the attributes  
class CharacterConfig extends Model<CharacterConfigAttributes, CharacterConfigCreationAttributes> implements CharacterConfigAttributes {  
  public id!: number; // Non-optional property  
  public name!: string;  
  public character!: object;  
  
  // Define associations  
  static associate(models: any) {  
    // Define associations here  
  }  
}  
  
// Initialize the model  
export default (sequelize: Sequelize): typeof CharacterConfig => {  
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
}; 