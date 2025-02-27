import { readFile } from "fs/promises";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

export async function goalsToElizaGoals(goals) {
  const elizaGoals = await readFile("src/data/sample/goals.json", "utf8");
  const chatCompletion = await client.chat.completions.create({
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant designed to process previous narrative goals to the subsequent json format.",
      },
      {
        role: "user",
        content: `
          Convert this narrative goal               

          ${goals}

          To this format (these values only as example).
          
          ${elizaGoals}
          `,
      },
    ],
    model: "gpt-4o-mini",
  });
  const responseText = chatCompletion.choices[0].message.content;
  const mainResult = JSON.parse(responseText);
  return mainResult.secondary_goals;
}

export async function personalityToCharacter(theContent) {
  const char = await readFile("src/data/sample/character.json", "utf8");
  const chatCompletion = await client.chat.completions.create({
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant designed to process previous json to the subsequent given json format.",
      },
      {
        role: "user",
        content: `
          given an agent data that will be created inside a community in a json format we have
          
          Agent Name: ${theContent.agent_name}
          Personality: ${theContent.agent_personality}
          Agent's Traits: ${theContent.traits.join(" ")}
          Agent's Tone of Voice: ${theContent.tone_voice.join(" ")}
          Community Name: ${theContent.community_name}
          Community Description: ${theContent.community_description}
          
          filled up this character.json values.
          Use this format (this and the value only as example). 
          ${char}
          Generate 3-6 question-answer examples (messageExamples)
          `,
      },
    ],
    model: "gpt-4o-mini",
  });
  const responseText = chatCompletion.choices[0].message.content;
  const mainResult = JSON.parse(responseText);

  let modelProvider;
  if (theContent.model_choice.startsWith("gpt")) {
    modelProvider = "openai";
  } else if (theContent.model_choice==="gemini") {
    modelProvider = "google";
  }
  const additional = {
    clients: ["direct"],
    modelProvider: modelProvider,
    plugins: [],
  };
  const finalResult = { ...mainResult, ...additional };
  return finalResult;
}

export async function greetings(character, username) {
  const chatCompletion = await client.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are an greetings agent that return ONLY greetings string based on the data provided",
      },
      {
        role: "user",
        content: `
          given these data:
          
          Your Name: ${character.name}

          User Name: ${username}
          
          Generate greetings message that usually appear in the first chat, dont forget to introduce your name. Mention the user's name also.
          `,
      },
    ],
    model: "gpt-4o-mini",
  });
  const responseText = chatCompletion.choices[0].message.content;
  return responseText;
}