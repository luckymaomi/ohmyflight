type JobskillItem = readonly [name: string, path: string];

interface JobskillSearchSource {
  name: string;
  path: string;
  markdown: string;
}

interface JobskillSearchResult extends JobskillSearchSource {
  snippet: string;
}

interface JobskillSearchEngine {
  normalizeQuery(value: string): string;
  stripFrontmatter(markdown: string): string;
  markdownToText(markdown: string): string;
  search(sources: JobskillSearchSource[], value: string): JobskillSearchResult[];
}

interface Window {
  JOBSKILL_ITEMS: JobskillItem[];
  JobskillSearch: JobskillSearchEngine;
}
