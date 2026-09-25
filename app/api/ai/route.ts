import { NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"

import {
  DEFAULT_GEMINI_MODEL,
  RECIPE_SCHEMA,
  MEAL_PLAN_SCHEMA,
  DAY_PLAN_SCHEMA,
  RECIPE_SYSTEM_PROMPT,
  PLANNER_SYSTEM_PROMPT,
  DAY_REGENERATION_SYSTEM_PROMPT,
} from "@/lib/ai/prompts"

const ALLOWED_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
]

type AIAction =
  | "test"
  | "recipe"
  | "planner"
  | "planner-day"

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json()

    const apiKey =
      typeof body.apiKey === "string"
        ? body.apiKey.trim()
        : ""

    const model =
      typeof body.model === "string" &&
      ALLOWED_MODELS.includes(body.model)
        ? body.model
        : DEFAULT_GEMINI_MODEL

    const action =
      body.action as AIAction

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API key is required.",
        },
        { status: 400 },
      )
    }

    if (
      !action ||
      ![
        "test",
        "recipe",
        "planner",
        "planner-day",
      ].includes(action)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid AI action.",
        },
        { status: 400 },
      )
    }

    const ai = new GoogleGenAI({
      apiKey,
    })

    if (action === "test") {
      const interaction =
        await ai.interactions.create({
          model,
          store: false,
          input:
            "Reply with exactly the word OK.",
        })

      return NextResponse.json({
        success: true,
        message:
          interaction.output_text || "OK",
        model,
      })
    }

    if (action === "recipe") {
      const input =
        typeof body.input === "string"
          ? body.input.trim()
          : ""

      if (!input) {
        return NextResponse.json(
          {
            error:
              "Please describe the dish first.",
          },
          { status: 400 },
        )
      }

      const interaction =
        await ai.interactions.create({
          model,
          store: false,
          system_instruction:
            RECIPE_SYSTEM_PROMPT,
          input: `
User's dish description:

${input}

Turn this into a structured household recipe.
Do not add meat or eggs.
Do not change the user's intended dish.
`,
          response_format: [
            {
              type: "text",
              mime_type:
                "application/json",
              schema: RECIPE_SCHEMA,
            },
          ],
        })

      if (!interaction.output_text) {
        throw new Error(
          "Gemini returned an empty recipe.",
        )
      }

      return NextResponse.json({
        success: true,
        result: JSON.parse(
          interaction.output_text,
        ),
      })
    }

    if (
      action === "planner" ||
      action === "planner-day"
    ) {
      const context = body.context

      if (!context) {
        return NextResponse.json(
          {
            error:
              "Planner context is required.",
          },
          { status: 400 },
        )
      }

      const isDay =
        action === "planner-day"

      const interaction =
        await ai.interactions.create({
          model,
          store: false,

          system_instruction: isDay
            ? DAY_REGENERATION_SYSTEM_PROMPT
            : PLANNER_SYSTEM_PROMPT,

          input: isDay
            ? `
Regenerate ONLY this target date.

TARGET DATE:
${context.target_date}

FULL PLANNING CONTEXT:

${JSON.stringify(
  context,
  null,
  2,
)}

Return exactly one replacement day for the target date.
Do not return the other six days.
`
            : `
Create a seven-day household meal plan.

IMPORTANT:
- Use only supplied recipe IDs.
- Use the exact supplied dates.
- Respect selected pantry.
- Respect general onion/garlic preferences.
- Respect date-specific restrictions.
- Respect cooking history.
- Return exactly seven days.

FULL PLANNING CONTEXT:

${JSON.stringify(
  context,
  null,
  2,
)}
`,

          response_format: [
            {
              type: "text",
              mime_type:
                "application/json",
              schema: isDay
                ? DAY_PLAN_SCHEMA
                : MEAL_PLAN_SCHEMA,
            },
          ],
        })

      if (!interaction.output_text) {
        throw new Error(
          "Gemini returned an empty meal plan.",
        )
      }

      return NextResponse.json({
        success: true,
        result: JSON.parse(
          interaction.output_text,
        ),
      })
    }

    return NextResponse.json(
      {
        error:
          "Unsupported AI action.",
      },
      { status: 400 },
    )
  } catch (error) {
    console.error(
      "Gemini API error:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gemini request failed.",
      },
      { status: 500 },
    )
  }
}