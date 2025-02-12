import { Action, elizaLogger, IAgentRuntime, Memory } from "@elizaos/core";

export const updateGoalAction: Action = {
  name: "UPDATE_GOAL",
  similes: ["MODIFY_GOAL", "EDIT_OBJECTIVE"],
  description: "Updates the status of an objective within a goal.",
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const { goalId, objectiveText } = message.data;
    if (!goalId || !objectiveText) {
      return false;
    }
    return true;
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    const { goalId, objectiveText, completed, notes } = message.data;
    elizaLogger
    elizaLogger.info(
      `Updating goal ${goalId} with objective: ${objectiveText}`
    );

    const dbRuntime = runtime.databaseAdapter;
    try {
      const goal = await dbRuntime.getGoals({ id: goalId });
      if (!goal) {
        elizaLogger.error(`Goal with ID ${goalId} not found.`);
        return;
      }

      const objectiveIndex = goal.objectives.findIndex(
        (obj) => obj.text === objectiveText
      );
      if (objectiveIndex === -1) {
        elizaLogger.error(
          `Objective "${objectiveText}" not found in goal ${goalId}.`
        );
        return;
      }

      goal.objectives[objectiveIndex].completed = completed;
      goal.objectives[objectiveIndex].notes = notes;

      await dbRuntime.updateGoal(goalId, {
        objectives: goal.objectives,
      });

      elizaLogger.info(`Goal ${goalId} updated successfully.`);
    } catch (error) {
      elizaLogger.error(`Error updating goal ${goalId}: ${error.message}`);
    }
  },
  examples: [],
};

export const addIncomeStreamAction: Action = {
  name: "ADD_INCOME_STREAM",
  similes: ["NEW_INCOME_SOURCE", "INCOME_UPDATE"],
  description: "Adds a new income stream to the agent's financial model.",
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const { name, amount } = message.data;
    return !!name && !!amount;
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    const { name, amount } = message.data;
    elizaLogger.info(`Adding income stream: ${name} ($${amount})`);

    const dbRuntime = runtime.databaseAdapter;
    try {
      const agent = runtime.character;
      const characterConfig = await dbRuntime.getCharacterConfig({
        name: agent.name,
      });
      if (!characterConfig) {
        elizaLogger.error(
          `CharacterConfig with name "${agent.name}" not found.`
        );
        return;
      }

      characterConfig.incomeStreams.push({ name, amount });
      await dbRuntime.updateCharacterConfig(characterConfig.id, {
        incomeStreams: characterConfig.incomeStreams,
      });

      elizaLogger.info(`Income stream added successfully.`);
    } catch (error) {
      elizaLogger.error(`Error adding income stream: ${error.message}`);
    }
  },
  examples: [],
};

export const updateBudgetAction: Action = {
  name: "UPDATE_BUDGET",
  similes: ["BUDGET_ADJUSTMENT", "MODIFY_EXPENSES"],
  description: "Updates the agent's budget to reflect new financial data.",
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const { budget } = message.data;
    return !!budget;
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    const { budget } = message.data;
    elizaLogger.info(`Updating budget to: $${budget}`);

    const dbRuntime = runtime.databaseAdapter;
    try {
      const agent = runtime.character;
      const characterConfig = await dbRuntime.getCharacterConfig({
        name: agent.name,
      });
      if (!characterConfig) {
        elizaLogger.error(
          `CharacterConfig with name "${agent.name}" not found.`
        );
        return;
      }

      characterConfig.budget = budget;
      await dbRuntime.updateCharacterConfig(characterConfig.id, {
        budget: characterConfig.budget,
      });

      elizaLogger.info(`Budget updated successfully.`);
    } catch (error) {
      elizaLogger.error(`Error updating budget: ${error.message}`);
    }
  },
  examples: [],
};

export const sendNotificationAction: Action = {
  name: "SEND_NOTIFICATION",
  similes: ["ALERT_USER", "MESSAGE_BROADCAST"],
  description: "Sends a notification message to the user.",
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return !!message.data.message;
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    const { message: notificationMessage } = message.data;
    elizaLogger.info(`Sending notification: ${notificationMessage}`);

    const dbRuntime = runtime.databaseAdapter;
    try {
      const agent = runtime.character;
      const characterConfig = await dbRuntime.getCharacterConfig({
        name: agent.name,
      });
      if (!characterConfig) {
        elizaLogger.error(
          `CharacterConfig with name "${agent.name}" not found.`
        );
        return;
      }

      // Send notification logic (e.g., via WebSocket)
      runtime.websocketService.broadcast(notificationMessage);

      elizaLogger.info(`Notification sent successfully.`);
    } catch (error) {
      elizaLogger.error(`Error sending notification: ${error.message}`);
    }
  },
  examples: [],
};

export default [
  updateGoalAction,
  addIncomeStreamAction,
  updateBudgetAction,
  sendNotificationAction,
];
