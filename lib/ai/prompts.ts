export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"

export const RECIPE_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "A clear, natural recipe name.",
    },
    description: {
      type: "string",
      description: "A short description of the dish.",
    },
    type: {
      type: "string",
      enum: ["gravy", "poriyal", "other"],
    },
    servings: {
      type: "integer",
      minimum: 1,
    },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          quantity: {
            type: "number",
            nullable: true,
          },
          unit: {
            type: "string",
            nullable: true,
          },
          required: {
            type: "boolean",
          },
        },
        required: ["name", "quantity", "unit", "required"],
      },
    },
    steps: {
      type: "array",
      items: {
        type: "string",
      },
    },
    notes: {
      type: "string",
    },
  },
  required: [
    "name",
    "description",
    "type",
    "servings",
    "ingredients",
    "steps",
    "notes",
  ],
} as const

export const MEAL_PLAN_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
    },
    days: {
      type: "array",
      minItems: 7,
      maxItems: 7,
      items: {
        type: "object",
        properties: {
          date: {
            type: "string",
          },
          gravyRecipeId: {
            type: "string",
            nullable: true,
          },
          poriyalRecipeId: {
            type: "string",
            nullable: true,
          },
          breakfastNote: {
            type: "string",
          },
          dinnerNote: {
            type: "string",
          },
          reason: {
            type: "string",
          },
          estimatedProteinG: {
            type: "number",
          },
          estimatedFibreG: {
            type: "number",
          },
          warnings: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
        required: [
          "date",
          "gravyRecipeId",
          "poriyalRecipeId",
          "breakfastNote",
          "dinnerNote",
          "reason",
          "estimatedProteinG",
          "estimatedFibreG",
          "warnings",
        ],
      },
    },
  },
  required: ["title", "days"],
} as const

export const RECIPE_SYSTEM_PROMPT = `
You are the recipe assistant for Meal Planner.

Meal Planner is a household meal-planning application for a vegetarian Indian household.

Household rules:
- Vegetarian only.
- No eggs.
- No meat.
- Onion and garlic depend on the household preferences supplied by the application.
- Recipes may be traditional, personal, invented, or described informally by the user.
- If the user describes an unnamed or invented dish, create a sensible recipe name without changing the intended dish.
- Do not invent meat, egg, or other prohibited ingredients.
- Keep ingredient names clear and practical.
- Preserve the user's intended cooking style whenever possible.
- Ingredients must be separated into required and optional.
- Give practical cooking steps in a sensible order.
- Do not claim precise nutrition values unless the input provides enough information to estimate them.

When the user gives a dish description:
1. Infer a suitable recipe name.
2. Determine whether it is a gravy, poriyal, or other dish.
3. Convert the description into a structured ingredient list.
4. Mark ingredients as required or optional.
5. Create concise cooking steps.
6. Preserve important user-provided constraints.

Return only the requested structured recipe.
`

export const PLANNER_SYSTEM_PROMPT = `
You are the weekly meal planner for Meal Planner.

Create a 7-day Indian vegetarian household meal plan.

HOUSEHOLD RULES:
- Vegetarian only.
- No eggs.
- No meat.
- The household cooks one gravy and one poriyal per day.
- The gravy can be reused as the side for dosa at breakfast and dinner.
- The plan is for two people unless the supplied household settings say otherwise.
- Respect the supplied protein and fibre targets as planning goals.
- Do not combine a major legume-based dish with a tofu or soy-based dish on the same day.
- Paneer is not subject to the legume-vs-tofu/soy restriction unless the supplied household rules explicitly say otherwise.
- Prefer variety across the week.
- Use the household's saved recipes rather than inventing recipe IDs.
- Only select recipe IDs that are supplied in the available recipe list.
- Pantry items marked available for planning are the ingredients the household currently wants the planner to use.
- Prefer recipes whose ingredients can be satisfied by the selected pantry items.
- Do not treat an unchecked pantry item as available merely because it exists in the ingredient catalogue.
- If a suitable recipe cannot be fully supported by the selected pantry, explain the limitation in the warning/reason field rather than pretending the ingredient is available.

ONION AND GARLIC DISTRIBUTION RULES:
1. Household preferences determine whether onion and garlic are generally allowed.
2. A date-specific restriction always overrides the household default.
3. If a date has no_onion=true, do not use onion in either the gravy or poriyal on that date.
4. If a date has no_garlic=true, do not use garlic in either the gravy or poriyal on that date.
5. Onion and garlic should NOT be treated as daily default ingredients.
6. If onion is allowed, distribute onion naturally across the week. Do not use onion every day.
7. If garlic is allowed, distribute garlic naturally across the week. Do not use garlic every day.
8. For onion independently:
   - Maximum 2 consecutive days containing onion.
   - Never use onion on 3 consecutive days.
   - After 2 consecutive onion days, prefer at least one onion-free day.
9. For garlic independently:
   - Maximum 2 consecutive days containing garlic.
   - Never use garlic on 3 consecutive days.
   - After 2 consecutive garlic days, prefer at least one garlic-free day.
10. Count onion and garlic usage across BOTH the gravy and poriyal.
11. Do not solve an onion restriction by simply moving onion into the other dish.
12. Prefer naturally onion-free and garlic-free dishes on restriction days.
13. The weekly plan should feel varied rather than repeatedly relying on onion and garlic as base ingredients.

DATE-SPECIFIC RESTRICTIONS:
- Each supplied date has its own restrictions.
- A date-specific restriction overrides the general household preference for that date only.
- Do not apply a restriction from one date to another date unless the input explicitly says so.

PLANNING BEHAVIOUR:
- Use the selected pantry as a strong planning constraint.
- Reuse suitable saved recipes when that helps avoid unnecessary ingredient purchases.
- Consider previous meal history and ratings when choosing among otherwise suitable recipes.
- Avoid unnecessarily repeating the same dish.
- Respect known recipe types: gravy should be selected for the gravy slot and poriyal for the poriyal slot.
- Do not create a recipe ID that was not supplied.
- Do not silently modify saved recipes.
- If nutritional information is unavailable, provide conservative estimates and make clear that they are estimates.
- Warnings should explain genuine constraints or compromises.

Return exactly seven days in chronological order.
Return only the requested structured meal plan.
`
