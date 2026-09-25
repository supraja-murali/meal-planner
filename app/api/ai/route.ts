import { NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"

import {
  DEFAULT_GEMINI_MODEL,
  RECIPE_SCHEMA,
  MEAL_PLAN_SCHEMA,
  RECIPE_SYSTEM_PROMPT,
  PLANNER_SYSTEM_PROMPT,
} from "@/lib/ai/prompts"

const ALLOWED_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
]

type AIAction =
  | "test"
  | "recipe"
  | "planner"

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

    const action = body.action as AIAction

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API key is required.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      !action ||
      !["test", "recipe", "planner"].includes(
        action,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid AI action.",
        },
        {
          status: 400,
        },
      )
    }

    const ai = new GoogleGenAI({
      apiKey,
    })

    // ------------------------------------------------------
    // Test connection
    // ------------------------------------------------------

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

    // ------------------------------------------------------
    // Recipe extraction
    // ------------------------------------------------------

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
          {
            status: 400,
          },
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
Do not add ingredients that were not supplied.
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
          "Gemini returned an empty response.",
        )
      }

      const parsed = JSON.parse(
        interaction.output_text,
      )

      return NextResponse.json({
        success: true,
        result: parsed,
      })
    }

    // ------------------------------------------------------
    // Meal planner
    // ------------------------------------------------------

    if (action === "planner") {
      const context = body.context

      if (!context) {
        return NextResponse.json(
          {
            error:
              "Planner context is required.",
          },
          {
            status: 400,
          },
        )
      }

      const interaction =
        await ai.interactions.create({
          model,
          store: false,

          system_instruction:
            PLANNER_SYSTEM_PROMPT,

          input: `
Create a weekly household meal plan from the following structured data.

IMPORTANT:
- Use only recipe IDs supplied in the recipe catalogue.
- Do not invent recipe IDs.
- Respect all household restrictions.
- Return exactly seven days.
- Use the exact dates supplied.

HOUSEHOLD CONTEXT:

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
              schema:
                MEAL_PLAN_SCHEMA,
            },
          ],
        })

      if (!interaction.output_text) {
        throw new Error(
          "Gemini returned an empty response.",
        )
      }

      const parsed = JSON.parse(
        interaction.output_text,
      )

      return NextResponse.json({
        success: true,
        result: parsed,
      })
    }

    return NextResponse.json(
      {
        error: "Unsupported action.",
      },
      {
        status: 400,
      },
    )
  } catch (error) {
    console.error(
      "Gemini API error:",
      error,
    )

    const message =
      error instanceof Error
        ? error.message
        : "Gemini request failed."

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      },
    )
  }
}