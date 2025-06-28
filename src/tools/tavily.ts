import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { z } from 'zod';
import { tool } from '@langchain/core/tools';

/**
 * @module TavilyTools
 * @description A collection of tools for performing advanced web searches using Tavily.
 */

/**
 * Initializes and exports the Tavily search tool with enhanced capabilities.
 * This tool allows the agent to perform web searches with fine-grained control over search parameters.
 * @function
 * @param {object} input - The input object for the search query.
 * @param {string} input.query - The search query string.
 * @param {('basic' | 'advanced')} [input.search_depth='basic'] - The depth of the search. 'basic' for quick results, 'advanced' for more comprehensive results.
 * @param {boolean} [input.include_answer=false] - Whether to include a concise answer to the query.
 * @param {boolean} [input.include_images=false] - Whether to include images in the search results.
 * @param {boolean} [input.include_raw_content=false] - Whether to include the raw HTML content of the search results.
 * @param {number} [input.max_results=5] - The maximum number of search results to return.
 * @param {number} [input.min_results] - The minimum number of search results to return.
 * @param {string[]} [input.exclude_domains] - A list of domains to exclude from the search results.
 * @param {string[]} [input.include_domains] - A list of domains to include in the search results.
 * @param {string} [input.start_date] - The start date for filtering results (YYYY-MM-DD).
 * @param {string} [input.end_date] - The end date for filtering results (YYYY-MM-DD).
 * @param {boolean} [input.unfilter=false] - Whether to unfilter the search results (e.g., remove duplicates).
 * @param {boolean} [input.follow_links=false] - Whether to follow links in the search results.
 * @param {string} [input.context] - Additional context for the search query.
 * @returns {Promise<string>} A JSON string of search results.
 */
export const tavilyTool = tool(
  async (input: {
    query: string;
    search_depth?: 'basic' | 'advanced';
    include_answer?: boolean;
    include_images?: boolean;
    include_raw_content?: boolean;
    max_results?: number;
    min_results?: number;
    exclude_domains?: string[];
    include_domains?: string[];
    start_date?: string;
    end_date?: string;
    unfilter?: boolean;
    follow_links?: boolean;
    context?: string;
  }) => {
    const tavily = new TavilySearchResults({
      apiKey: process.env.TAVILY_API_KEY, // Assuming API key is available via process.env
      maxResults: input.max_results || 5,
    });

    try {
      const results = await tavily.invoke(input.query, {
        search_depth: input.search_depth,
        include_answer: input.include_answer,
        include_images: input.include_images,
        include_raw_content: input.include_raw_content,
        min_results: input.min_results,
        exclude_domains: input.exclude_domains,
        include_domains: input.include_domains,
        start_date: input.start_date,
        end_date: input.end_date,
        unfilter: input.unfilter,
        follow_links: input.follow_links,
        context: input.context,
      });
      return JSON.stringify(results);
    } catch (error: any) {
      console.error("Error performing Tavily search:", error);
      return `Error performing Tavily search: ${error.message}`;
    }
  },
  {
    name: "tavily_search",
    description: "Performs advanced web searches using Tavily. Useful for general knowledge, current events, and detailed information retrieval.",
    schema: z.object({
      query: z.string().describe("The search query string."),
      search_depth: z.enum(['basic', 'advanced']).optional().describe("The depth of the search. 'basic' for quick results, 'advanced' for more comprehensive results."),
      include_answer: z.boolean().optional().describe("Whether to include a concise answer to the query."),
      include_images: z.boolean().optional().describe("Whether to include images in the search results."),
      include_raw_content: z.boolean().optional().describe("Whether to include the raw HTML content of the search results."),
      max_results: z.number().int().min(1).optional().describe("The maximum number of search results to return."),
      min_results: z.number().int().min(1).optional().describe("The minimum number of search results to return."),
      exclude_domains: z.array(z.string()).optional().describe("A list of domains to exclude from the search results."),
      include_domains: z.array(z.string()).optional().describe("A list of domains to include in the search results."),
      start_date: z.string().optional().describe("The start date for filtering results (YYYY-MM-DD)."),
      end_date: z.string().optional().describe("The end date for filtering results (YYYY-MM-DD)."),
      unfilter: z.boolean().optional().describe("Whether to unfilter the search results (e.g., remove duplicates)."),
      follow_links: z.boolean().optional().describe("Whether to follow links in the search results."),
      context: z.string().optional().describe("Additional context for the search query."),
    }),
  }
);