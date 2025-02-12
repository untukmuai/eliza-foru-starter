import { Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";

const PostTwitterAction: Action = {
    similes: [],
    description: "",
    examples: [],
    handler: function (runtime: IAgentRuntime, message: Memory, state?: State, options?: { [key: string]: unknown; }, callback?: HandlerCallback): Promise<unknown> {
        throw new Error("Function not implemented.");
    },
    name: "",
    validate: function (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> {
        throw new Error("Function not implemented.");
    }
}