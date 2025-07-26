export interface RoadmapItem {
  action: string
  deadline: string
  notes: string
}

export interface Resource {
  title: string
  url: string
  type: string
}

export interface SearchSource {
  title: string
  url: string
  snippet: string
}

export interface AIResponse {
  text: string
  title: string
  roadmap: RoadmapItem[]
  resources: Resource[]
}

export interface PerplexityResponse {
  searchResults: string
  searchSources: SearchSource[]
}

export interface BedrockRequest {
  searchResults: string
} 