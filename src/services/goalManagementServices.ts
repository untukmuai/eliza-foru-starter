import { GoalFundamental, GoalSecondary } from "../models/dto/goals-fundamental";

export function formatPrimaryGoal(goal: GoalFundamental): string {
  if (
    !goal ||
    !goal.title ||
    !goal.objectives ||
    goal.objectives.length === 0
  ) {
    throw new Error("Invalid primary goal object");
  }

  // Format the goal title
  let formattedString = `## Primary Goal: ${goal.title}\n\n`;

  // Append each objective as a bullet point
  formattedString +=
    goal.objectives
      .map((obj) => `- ${obj}.`)
      .join("\n") + "\n";

  return formattedString;
}

export function convertGoalsListToString(goalsModels: any[]): string {
  const goalsList = goalsModels.map((goalModel) => {
    if (
      !goalModel ||
      !goalModel.name ||
      !goalModel.objectives ||
      goalModel.objectives.length === 0
    ) {
      throw new Error("Invalid goalList object");
    }
    return {
      title: goalModel.name,
      objectives: goalModel.objectives.map((obj: any) => obj.text),
    } as GoalSecondary;
  });

  return goalsList.map(formatSecondaryGoal).join("\n");
}


export function formatSecondaryGoal(goal: GoalSecondary): string {
  if (
    !goal ||
    !goal.title ||
    !goal.objectives ||
    goal.objectives.length === 0
  ) {
    throw new Error("Invalid secondary goal object");
  }

  // Format the goal title
  let formattedString = `## Secondary Goal: ${goal.title}\n\n`;

  // Append each objective as a bullet point
  formattedString +=
    goal.objectives
      .map((obj) => `- ${obj}.`)
      .join("\n") + "\n";

  return formattedString;
}
