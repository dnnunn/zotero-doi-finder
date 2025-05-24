# Zotero DOI Finder

[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

A Zotero plugin that automatically finds and adds missing DOI numbers to your references using CrossRef API.

## Features

- 🔍 **Automatic DOI Discovery**: Searches CrossRef for missing DOIs using title and author information
- 🎯 **Smart Matching**: Uses advanced title similarity matching to ensure accurate results
- 📚 **Bulk Processing**: Process entire collections or libraries at once
- ⚡ **Rate Limiting**: Configurable delays to respect API limits
- 🌐 **Multi-language Support**: Available in English and Chinese
- 🎨 **Native Zotero Integration**: Seamlessly integrates with Zotero 7's interface

## Installation

1. Download the latest `.xpi` file from the [Releases](https://github.com/yourusername/zotero-doi-finder/releases) page
2. Open Zotero 7
3. Go to Tools → Add-ons
4. Click the gear icon and select "Install Add-on From File..."
5. Select the downloaded `.xpi` file

## Usage

### Finding DOIs for Selected Items
1. Select one or more items in your library
2. Right-click and choose "Find DOI"
3. The plugin will search for and add any missing DOIs

### Finding DOIs for a Collection
1. Right-click on a collection
2. Choose "Find DOIs in Collection"
3. All items without DOIs in the collection will be processed

### Finding DOIs for Your Entire Library
1. Go to Tools → Find DOIs in Library
2. Or click the DOI Finder button in the toolbar
3. Or use the keyboard shortcut: `Ctrl/Cmd + Alt + D`

## Configuration

Access the preferences through Tools → Add-ons → DOI Finder → Preferences

### Available Settings:
- **Auto-find DOIs**: Automatically search for DOIs when adding new items (disabled by default)
- **Rate Limit**: Delay between API requests in milliseconds (default: 300ms)
- **Title Similarity Matching**: Use fuzzy matching for titles (enabled by default)
- **Similarity Threshold**: How similar titles must be to match (0.0-1.0, default: 0.85)

## How It Works

The plugin uses the CrossRef API to search for DOIs:
1. Extracts the title, first author's last name, and publication year from each item
2. Queries CrossRef with this information
3. Compares returned results using intelligent title matching
4. Updates items with found DOIs

### Title Matching Algorithm
- Normalizes titles by removing punctuation and converting to lowercase
- Checks for exact matches
- Checks if one title contains the other (useful for subtitles)
- Calculates similarity score using Levenshtein distance
- Only accepts matches above the configured threshold

## Development

### Prerequisites
- Node.js (v16 or higher)
- Git
- Zotero 7 (beta)

### Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/zotero-doi-finder.git
cd zotero-doi-finder

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your Zotero installation path

# Start development server
npm start
```

### Building
```bash
# Build the plugin
npm run build

# Create a release
npm run release
```

## API Information

This plugin uses the public CrossRef API:
- No API key required
- Rate limit: Be respectful of the service
- Documentation: https://www.crossref.org/documentation/retrieve-metadata/rest-api/

## Troubleshooting

### DOIs Not Found
- Ensure the item has a title
- Check that the title is correctly entered
- Try lowering the similarity threshold in preferences
- Some older or obscure publications may not have DOIs

### Rate Limiting
- If you get errors, try increasing the rate limit delay
- Default 300ms should work for most cases
- For large libraries, consider processing in smaller batches

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the AGPL-3.0 License - see the LICENSE file for details.

## Acknowledgments

- Built using the [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template)
- Powered by [CrossRef API](https://www.crossref.org/)
- Thanks to the Zotero development team for Zotero 7

## Support

If you encounter any issues or have suggestions:
- Open an issue on [GitHub](https://github.com/yourusername/zotero-doi-finder/issues)
- Check existing issues for solutions
- Provide detailed information about your setup and the problem