#!/bin/bash

# List of all files with Supabase imports
files=(
  "components/SiteNav.vue"
  "pages/memories.vue"
  "pages/debugChat.vue"
  "pages/status.vue"
  "pages/queue.vue"
  "pages/login.vue"
  "components/VerboseLogViewer.vue"
  "components/TodoViewer.vue"
  "components/TableOverviewSparklines.vue"
  "components/QueueViewer.vue"
  "components/PromptsView.vue"
  "components/NetworkGraph.vue"
  "components/MessagesView.vue"
  "components/MemoryStats.vue"
  "components/MemoriesView.vue"
  "components/LogViewer.vue"
  "components/DataVisualizations.vue"
  "components/ConfigView.vue"
)

for file in "${files[@]}"; do
  echo "Processing $file..."
  
  # Comment out the import statement
  sed -i '' "s/import { useSupabaseClient } from '#imports'/\/\/ import { useSupabaseClient } from '#imports'/g" "$file"
  
  # Comment out the const supabase line
  sed -i '' "s/const supabase = useSupabaseClient()/\/\/ const supabase = useSupabaseClient()/g" "$file"
  
done

echo "Done! All Supabase imports have been commented out."