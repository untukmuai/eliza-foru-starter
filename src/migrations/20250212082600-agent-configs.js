"use strict";

const migration = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("agent_configs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      agent_id: {
        type: Sequelize.STRING,
      },
      config_key: {
        type: Sequelize.STRING,
      },
      config_value: {
        type: Sequelize.JSONB,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: {
        allowNull: true,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("agent_configs");
  },
};

export default migration;
