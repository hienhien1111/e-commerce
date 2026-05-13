# /prd — Generate PRD + Progress for a Feature

Use this command when you already know the feature name and want a Ralph-ready spec package without the broader `/kickoff` flow.

## Usage

`/prd <feature-name>`

## Output

- `features/<feature-name>/PRD.md` (requirements + tasks in one file)
- `features/<feature-name>/progress.md` (empty template for Ralph)

## Requirements

- PRD must be evidence-based and match existing code patterns
- SQL examples must be runnable
- Requirements should be testable and written in concrete WHEN/THEN form
- Tasks go in ## Tasks section at the bottom of PRD.md, implementation-ordered:
  - database
  - server
  - client
  - integration
- Every task must include:
  - a concrete file target
  - a short signature or implementation anchor
  - a Ralph-sized scope (one commit, 5-15 min)
  - VERIFY steps for UI work

## Notes

- `/prd` is a planning primitive.
- It does not run `./ralph.sh`.
- Use `/kickoff` when you want repo checks, orient exploration, and conversational review in one flow.
