# Style Showcase - I18n Example

This example demonstrates how to organize multilingual translation files for use with `composeTextFragments` while maintaining semantic integrity and style information.

## File Structure

```
style-showcase/
├── locales/
│   ├── en.json              # English translations
│   └── zh.json              # Chinese translations
├── i18n-utils.ts            # Translation parsing utilities
├── style-showcase.tsx       # Original simple example
├── style-showcase-i18n.tsx  # Interactive i18n version
├── style-showcase-static.tsx # Static bilingual version
└── index.ts                 # Entry point
```

## Translation Format

### Semantic Structure
```json
{
  "header": {
    "title": "{{text:Display Text|styles}}"
  },
  "styles": {
    "colors": {
      "red": "{{text:Red|color:red}}"
    }
  }
}
```

### Style Syntax
The format `{{text:DisplayText|style1:value1,style2:value2}}` allows embedding both content and styling:

- `text:` - The display text in target language
- `|` - Separator between text and styles
- `style:value` - Style properties (comma-separated)

### Supported Styles
- `color:red` - Text color
- `backgroundColor:blue` - Background color  
- `bold:true` - Bold text
- `italic:true` - Italic text
- `underline:true` - Underlined text
- `strikethrough:true` - Strikethrough text
- `dimColor:true` - Dimmed color
- `inverse:true` - Inverted colors

## Usage Examples

### Basic Translation
```json
{
  "welcome": "{{text:Welcome|color:green,bold:true}}"
}
```

### Complex Styling
```json
{
  "error": "{{text:Error!|color:red,bold:true,backgroundColor:yellow}}"
}
```

### Plain Text (no styling)
```json
{
  "description": "This is plain text without styling"
}
```

## Running the Examples

```bash
# Static bilingual version (recommended)
npx tsx examples/style-showcase/style-showcase-static.tsx

# Interactive version with language switching
npx tsx examples/style-showcase/style-showcase-i18n.tsx

# Original simple version
npx tsx examples/style-showcase/style-showcase.tsx
```

## Benefits

1. **Semantic Integrity** - Translators see meaningful context
2. **Style Preservation** - Visual styling information is embedded
3. **Type Safety** - Full TypeScript support
4. **Maintainability** - Clear separation of content and presentation
5. **Scalability** - Easy to add new languages and styles

## Real-world Usage

This pattern is ideal for:
- CLI tools with international users
- Developer tooling with rich text output
- Documentation generators
- Interactive terminal applications
- Build tools with styled error/success messages