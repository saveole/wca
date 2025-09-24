# WebClip Assistant

A smart browser extension that helps you capture, organize, and export web content intelligently.

## Features

- **Smart Content Capture**: Automatically extracts page title, URL, description, and metadata
- **AI-Powered Summarization**: Generate concise summaries using OpenAI or other LLM APIs
- **Flexible Export Options**: Export to Markdown or JSON formats
- **Notion Integration**: Save clips directly to your Notion database
- **Tag Management**: Add custom tags for better organization
- **Personal Notes**: Add your own thoughts and annotations
- **Dark/Light Theme**: Beautiful interface with theme support

## Installation

### Development Mode

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the project folder
6. The extension will be installed and ready to use

### Required Permissions

The extension requires the following permissions:
- `activeTab` - Access to the current tab for content extraction
- `storage` - Store settings and API keys locally
- `downloads` - Download exported files
- API host permissions for external services

## Setup

### 1. Configure AI API

1. Click the extension icon in your browser toolbar
2. Click the settings button or right-click the extension and select "Options"
3. Enter your AI service API key (OpenAI, Anthropic, or custom provider)
4. Configure the API endpoint if using a custom provider

### 2. Configure Notion Integration (Optional)

1. In the settings page, expand the "Notion Integration" section
2. Enter your Notion Integration Token
3. Enter your Notion Database ID
4. Configure field mappings to match your database structure

#### Creating a Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Give it a name (e.g., "WebClip Assistant")
4. Copy the "Internal Integration Token"
5. Share your database with the integration

#### Finding Your Database ID

1. Open your Notion database
2. Copy the URL and extract the ID (the part after `/` and before `?`)
3. It should look like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

## Usage

1. Navigate to any webpage you want to clip
2. Click the WebClip Assistant extension icon
3. The extension will automatically extract page information
4. Edit any fields as needed
5. Add personal notes and tags
6. Choose your export method:
   - **Export MD**: Download as Markdown file
   - **Export JSON**: Download as JSON file
   - **Save to Notion**: Save directly to your Notion database

## File Structure

```
wca/
├── manifest.json           # Extension manifest
├── background.js           # Background service worker
├── ui/
│   ├── main_popup_code.html    # Main popup interface
│   ├── popup.js                # Popup functionality
│   ├── settings_code.html      # Settings page
│   └── settings.js             # Settings functionality
├── icons/                  # Extension icons
├── docs/
│   └── prd_v1.md          # Product requirements
├── README.md              # This file
└── CLAUDE.md              # Development guide
```

## API Configuration

### OpenAI
- **Provider**: OpenAI
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **API Key**: Your OpenAI API key

### Anthropic
- **Provider**: Anthropic
- **Endpoint**: `https://api.anthropic.com/v1/messages`
- **API Key**: Your Anthropic API key

### Custom Provider
- **Provider**: Custom
- **Endpoint**: Your custom API endpoint
- **API Key**: Your API key

## Security

- All API keys are stored locally in your browser using `chrome.storage.sync`
- No data is sent to external servers except for API calls to configured services
- All external API calls use HTTPS encryption

## Development

This extension is built with vanilla JavaScript and uses:
- Tailwind CSS for styling
- Material Symbols for icons
- Chrome Extension APIs for functionality

## Troubleshooting

### Extension won't load
- Make sure all files are in the correct locations
- Check the Chrome extension console for errors
- Ensure you're using Chrome and Manifest V3

### API calls failing
- Verify your API keys are correct
- Check your API quota/billing
- Ensure the API endpoint is correct

### Notion integration not working
- Verify your integration token is correct
- Make sure you've shared the database with your integration
- Check that field mappings match your database properties

## License

This project is open source and available under the MIT License.