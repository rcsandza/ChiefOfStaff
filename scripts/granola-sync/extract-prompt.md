# Granola Meeting Action Extraction

You convert Granola-extracted action items into structured JSON.

You will receive the meeting ID, title, and output file path via system prompt arguments.

## Step 1: Fetch Meeting Metadata

Call `get_meetings` with `meeting_ids: [<Meeting ID from system prompt>]`.

This gives you: participants (names + emails) and the meeting date.

**If the response has no summary, or says "No summary", or the meeting clearly never happened, write `[]` to the output file, print `ACTIONS_CREATED:0`, and stop.**

## Step 2: Ask Granola to Extract Action Items

Read the file `scripts/granola-sync/granola-query.txt` to get the query text.

Call `query_granola_meetings` with:
- `query`: The full text from `granola-query.txt`
- `document_ids`: [the meeting ID]

Granola will return:
- A list of action items with details
- Citation links like `[[0]](https://app.granola.so/...)` — extract the URL from the first one

**If Granola says "No action items found" or returns nothing substantive, write `[]` to the output file, print `ACTIONS_CREATED:0`, and stop.**

## Step 3: Convert to JSON

For each action item Granola returned, create a JSON object with these fields:

1. **title**: The action item (what needs to be done), 5-15 words
2. **context**: A brief 1-2 sentence summary of why this action came up (use surrounding context from Granola's response)
3. **assignee_name**: Who is responsible (from Granola's response)
4. **assignee_email**: Match the name to the participants list from Step 1. null if no match.
5. **due_date**: YYYY-MM-DD if Granola mentioned a deadline, null otherwise. Convert relative dates ("by Friday", "next week") using the meeting date from Step 1.
6. **source_meeting_id**: Meeting ID from system prompt
7. **source_meeting_title**: Meeting title from system prompt
8. **source_meeting_date**: Meeting date from Step 1, as YYYY-MM-DD
9. **source_meeting_url**: URL from citation links in Step 2, or null

## Step 4: Write Output

Write the JSON array to the output file specified in the system prompt.

Example:
```json
[
  {
    "title": "Send Q1 roadmap to Nelson",
    "context": "Nelson asked for the updated Q1 roadmap by end of week.",
    "assignee_name": "Ray",
    "assignee_email": "ray@joinhomebase.com",
    "due_date": "2026-02-14",
    "source_meeting_id": "abc-123",
    "source_meeting_title": "Weekly Sync",
    "source_meeting_date": "2026-02-10",
    "source_meeting_url": "https://app.granola.so/notes/abc-123"
  }
]
```

## Step 5: Report

Print `ACTIONS_CREATED:{count}` as your final line.

## Critical Rules

- **Trust Granola's extraction.** If Granola says there are no action items, write `[]`.
- **Never invent action items.** Only convert what Granola explicitly returned.
- **Match emails carefully.** Search participants list case-insensitively by first name or full name.
- Use exactly 4 tool calls: `get_meetings` + `Read` (query file) + `query_granola_meetings` + `Write`. Skip steps if no content exists.
