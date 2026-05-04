---
name: mag-visual-generate
description: |
  Universal image generator using Gemini API with customizable styles.
  Styles are defined in the styles/ folder as .txt files.
  API key loaded automatically from .env.local.
---

# MAG Visual Generate

Universal image generator with predefined visual styles.

## IMPORTANT: Style Selection Workflow

When the user requests image generation:

1. **If user specifies a style** → Use that style directly
2. **If user provides custom style description** → Pass it as --style parameter
3. **If no style specified** → **USE AskUserQuestion** to let user choose

### Using AskUserQuestion for Style Selection

When no style is specified, use AskUserQuestion with available styles as options:

```
Use AskUserQuestion with:
- question: "Which visual style should I use for this image?"
- header: "Style"
- options: Show 4 most relevant styles based on context
- multiSelect: false
```

**Example styles to offer based on context:**

- Business report → mckinsey, corporate, infographic, minimal
- Tech content → tech, isometric, minimal, corporate
- Creative/artistic → watercolor, sketch, cartoon, retro
- Workshop/process → whiteboard, infographic, sketch, isometric

## Available Styles

Styles are loaded from `styles/` folder. Each `.txt` file is a style:

| Style         | Best For                                        |
| ------------- | ----------------------------------------------- |
| `whiteboard`  | Workshop notes, brainstorming, process sketches |
| `mckinsey`    | Business publications, executive reports        |
| `cartoon`     | Children's content, playful visuals             |
| `tech`        | AI, software, innovation topics                 |
| `infographic` | Data, processes, timelines                      |
| `corporate`   | Professional presentations, reports             |
| `sketch`      | Ideation, concepts, personal touch              |
| `minimal`     | Clean, focused single-concept visuals           |
| `watercolor`  | Artistic, emotional, elegant content            |
| `retro`       | Nostalgic, vintage aesthetic                    |
| `isometric`   | Systems, architecture, tech explanations        |

## Usage

### Basic Command

```bash
./scripts/generate_image.py "description" --style STYLE_NAME
```

### List Available Styles

```bash
./scripts/generate_image.py --list-styles
./scripts/generate_image.py --list-styles --verbose  # Full descriptions
```

### With Copy to Destination

```bash
./scripts/generate_image.py "AI transformation" --style tech \
  --copy-to projects/report/hero.png
```

### Custom Style Description

```bash
./scripts/generate_image.py "mountain landscape" \
  --style "Oil painting style with thick brushstrokes and vivid colors"
```

## Adding New Styles

Create a new `.txt` file in `styles/` folder:

```bash
# styles/blueprint.txt
Blueprint / Technical Drawing Style

Technical blueprint illustration:
- White lines on dark blue background (#003366)
- Technical drawing aesthetic with grid
- Precise geometric shapes
- Engineering/architecture feel
- Annotations and measurements style
- CAD-like precision
```

The style will be automatically available.

## Workflow Example

**User says:** "Generate an image showing our Q1 roadmap"

**Claude should:**

1. No style specified → Use AskUserQuestion
2. Offer relevant options: infographic, whiteboard, corporate, mckinsey
3. User selects "infographic"
4. Run: `./scripts/generate_image.py "Q1 roadmap with milestones" --style infographic`

## Output

Files saved to `~/c3z-brain/900_Archives/cezos/processing/images/`:

```
YYYYMMDD_HHMMSS_description.png
```

## Environment

API key loaded automatically from `.env.local`:

```
GEMINI_API_KEY=your_key_here
```

## File Structure

```
mag-visual-generate/
├── SKILL.md
├── scripts/
│   └── generate_image.py
└── styles/
    ├── whiteboard.txt
    ├── mckinsey.txt
    ├── cartoon.txt
    ├── tech.txt
    ├── infographic.txt
    ├── corporate.txt
    ├── sketch.txt
    ├── minimal.txt
    ├── watercolor.txt
    ├── retro.txt
    └── isometric.txt
```

## CLI Reference

```
usage: generate_image.py [-h] [--style STYLE] [--output OUTPUT]
                         [--copy-to COPY_TO] [--list-styles] [--verbose]
                         [prompt]

Arguments:
  prompt              Image prompt/description

Options:
  --style, -s         Style name or custom description (REQUIRED)
  --output, -o        Custom output path
  --copy-to           Copy result to destination path
  --list-styles       Show all available styles
  --verbose, -v       Show full style descriptions
```
