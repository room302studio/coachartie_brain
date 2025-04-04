# Room 302 Nuxt 3 Starter

## Usage
`npx room302-template`

Deployed through a small script that handles naming, cloning, and setting up the repo for prototyping. <https://www.npmjs.com/package/room302-template>

## What's different from the standard Nuxt 3 starter?
- VueUse 🔧 
- Vueuse motion 🌈 
- OpenAI plugin 🧠 
- Pinia store 🏬 
- Helpers file 🔨 
- Google fonts 🖋️ 

Look at the [Nuxt 3 documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install the dependencies:

```bash
# yarn install
yarn install

# run the dev server
yarn dev
```

## Deployment

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Status Page Data Structure

The `/status` page provides anonymized usage statistics without exposing PII. It can be used for showcasing bot activity. The page provides the following data structure:

### Top-level Metrics
```json
{
  "messageCount": 1250,                    // Total messages processed
  "memoryCount": 487,                      // Total memories stored
  "queueCount": 98,                        // Total queue items
  "messageTypes": {                        // Message type distribution
    "email": 500,                         
    "chat": 687,
    "other": 63
  },
  "queueStatus": {                         // Queue status distribution
    "completed": 83,
    "error": 15
  },
  "lastUpdated": "2023-05-24 15:30:45",    // Last refresh timestamp
  "uptimeDays": 45                         // System uptime in days
}
```

### Time Series Data (24h)
Each of these arrays contains 24 hourly data points:

```json
{
  "messagesCreatedData": [                 // Hourly message creation
    {"timestamp": "2023-05-24T00:00:00.000Z", "count": 3},
    {"timestamp": "2023-05-24T01:00:00.000Z", "count": 5},
    ...
  ],
  "memoriesCreatedData": [                 // Hourly memory creation
    {"timestamp": "2023-05-24T00:00:00.000Z", "count": 2},
    {"timestamp": "2023-05-24T01:00:00.000Z", "count": 1},
    ...
  ],
  "queueCompletedData": [                  // Hourly queue completions
    {"timestamp": "2023-05-24T00:00:00.000Z", "count": 4},
    {"timestamp": "2023-05-24T01:00:00.000Z", "count": 3},
    ...
  ],
  "queueErrorData": [                      // Hourly queue errors
    {"timestamp": "2023-05-24T00:00:00.000Z", "count": 0},
    {"timestamp": "2023-05-24T01:00:00.000Z", "count": 1},
    ...
  ]
}
```

### Memory Distribution Data
```json
{
  "memoryTypesData": [                     // Memory types distribution
    {"name": "fact", "count": 45},
    {"name": "concept", "count": 28},
    {"name": "conversation", "count": 67},
    {"name": "experience", "count": 34},
    {"name": "person", "count": 19}
  ],
  "memoryAgeData": [                       // Memory age distribution
    {"name": "Today", "count": 12},
    {"name": "1-7 days", "count": 24},
    {"name": "1-4 weeks", "count": 45},
    {"name": "1-3 months", "count": 35},
    {"name": "3+ months", "count": 22}
  ]
}
```

### Integration Examples

The status page can be embedded or referenced externally through:

1. **iFrame Integration**:
   ```html
   <iframe src="https://your-bot-domain.com/status" width="100%" height="800px"></iframe>
   ```

2. **API Integration**:
   The data can be exposed as a JSON endpoint by creating an API endpoint that returns the same data structure. Example:
   ```js
   // In server/api/status.js
   export default defineEventHandler(async (event) => {
     // This would pull the same data as displayed on the /status page
     const data = await fetchStatusData()
     return data
   })
   ```

3. **Data Visualization Integration**:
   The time series and distribution data can be used with visualization libraries like D3.js, Chart.js, or Plotly to create custom visualizations for the showcase.

### API Integration

The status data is available through a dedicated API endpoint at `/api/status` that returns the exact same data structure in JSON format. This endpoint can be used to integrate with external systems or create custom visualizations.

Example usage:
```js
// Fetch status data from API endpoint
async function fetchBotStatus() {
  const response = await fetch('https://your-bot-domain.com/api/status')
  const data = await response.json()
  return data
}

// Example integration with a third-party dashboard
async function updateDashboard() {
  const statusData = await fetchBotStatus()
  
  // Update activity metrics
  document.getElementById('message-count').textContent = statusData.messageCount
  document.getElementById('memory-count').textContent = statusData.memoryCount
  
  // Create charts with the time series data
  createChart('message-trend', statusData.messagesCreatedData)
  createChart('memory-distribution', statusData.memoryTypesData)
}
```

The API endpoint provides a fallback mechanism that generates plausible sample data if database access fails, ensuring your integration always gets a response in the expected format.
