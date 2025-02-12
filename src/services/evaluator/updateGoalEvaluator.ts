import { Evaluator, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";

export const UpdateGoalEvaluator: Evaluator = {
    description: "",
    similes: [],
    examples: [],
    handler: function (runtime: IAgentRuntime, message: Memory, state?: State, options?: { [key: string]: unknown; }, callback?: HandlerCallback): Promise<unknown> {
        throw new Error("Function not implemented.");
    },
    name: "",
    validate: function (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> {
        throw new Error("Function not implemented.");
    }
}