"use strict";

const migration = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("agent_proxys", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      agentId: {
        type: Sequelize.STRING,
        alloqNull: true,
      },
      host: {
        type: Sequelize.STRING,
        alloqNull: false,
      },
      port: {
        type: Sequelize.STRING,
        alloqNull: false,
      },
      username: {
        type: Sequelize.STRING,
      },
      password: {
        type: Sequelize.STRING,
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
    await queryInterface.dropTable("agent_proxys");
  },
};

export default migration;
