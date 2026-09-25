const ONION_GARLIC_PLANNING_RULES = `
ONION AND GARLIC DISTRIBUTION RULES:

1. Household preferences determine whether onion and garlic are generally allowed.

2. A date-specific restriction always overrides the household default:
   - If a date has no_onion=true, do not use onion in either the gravy or poriyal on that date.
   - If a date has no_garlic=true, do not use garlic in either the gravy or poriyal on that date.

3. Onion and garlic should NOT be treated as daily default ingredients.

4. If onion is allowed, distribute onion naturally across the week.
   Do not use onion on every day.

5. If garlic is allowed, distribute garlic naturally across the week.
   Do not use garlic on every day.

6. For onion independently:
   - Maximum 2 consecutive days containing onion.
   - Never use onion on 3 consecutive days.
   - After 2 consecutive onion days, prefer at least one onion-free day.

7. For garlic independently:
   - Maximum 2 consecutive days containing garlic.
   - Never use garlic on 3 consecutive days.
   - After 2 consecutive garlic days, prefer at least one garlic-free day.

8. Count onion/garlic usage across BOTH the gravy and poriyal.
   A day containing onion in either dish counts as an onion day.
   A day containing garlic in either dish counts as a garlic day.

9. Do not solve an onion restriction by simply moving onion into the other dish.

10. Prefer naturally onion-free and garlic-free dishes on restriction days.

11. The weekly plan should feel varied rather than repeatedly relying on onion and garlic as base ingredients.
`