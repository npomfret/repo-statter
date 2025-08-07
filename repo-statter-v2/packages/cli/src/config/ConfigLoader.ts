import { cosmiconfig } from 'cosmiconfig'
import { z } from 'zod'
import { resolve } from 'path'

const ConfigSchema = z.object({
  output: z.string().optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  cache: z.boolean().optional(),
  maxCommits: z.number().positive().optional(),
  filters: z.object({
    include: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional()
  }).optional(),
  visualization: z.object({
    charts: z.array(z.string()).optional(),
    colors: z.record(z.string()).optional()
  }).optional(),
  performance: z.object({
    workerThreads: z.number().optional(),
    chunkSize: z.number().optional()
  }).optional(),
  report: z.object({
    inlineAssets: z.boolean().optional(),
    minify: z.boolean().optional(),
    includeSourceData: z.boolean().optional()
  }).optional()
})

export type Config = z.infer<typeof ConfigSchema>

export class ConfigLoader {
  private static explorer = cosmiconfig('repo-statter', {
    searchPlaces: [
      '.repo-statter.json',
      '.repo-statter.yaml',
      '.repo-statter.yml',
      '.repo-statterrc',
      '.repo-statterrc.json',
      '.repo-statterrc.yaml',
      '.repo-statterrc.yml',
      'repo-statter.config.js',
      'repo-statter.config.mjs',
      'package.json'
    ]
  })
  
  static async load(configPath?: string): Promise<Config> {
    try {
      let result
      
      if (configPath) {
        // Load specific config file
        result = await this.explorer.load(resolve(configPath))
      } else {
        // Search for config file
        result = await this.explorer.search()
      }
      
      if (!result) {
        return this.loadFromEnv()
      }
      
      // Validate config
      const validated = ConfigSchema.parse(result.config)
      
      // Merge with environment variables
      return this.mergeWithEnv(validated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid configuration:\n${error.errors
            .map((e: any) => `  - ${e.path.join('.')}: ${e.message}`)
            .join('\n')}`
        )
      }
      throw error
    }
  }
  
  private static loadFromEnv(): Config {
    const config: any = {}
    
    if (process.env.REPO_STATTER_OUTPUT) {
      config.output = process.env.REPO_STATTER_OUTPUT
    }
    
    if (process.env.REPO_STATTER_THEME) {
      config.theme = process.env.REPO_STATTER_THEME
    }
    
    if (process.env.REPO_STATTER_NO_CACHE) {
      config.cache = false
    }
    
    if (process.env.REPO_STATTER_MAX_COMMITS) {
      config.maxCommits = parseInt(process.env.REPO_STATTER_MAX_COMMITS)
    }
    
    return ConfigSchema.parse(config)
  }
  
  private static mergeWithEnv(config: Config): Config {
    const envConfig = this.loadFromEnv()
    
    return {
      ...config,
      ...envConfig,
      filters: {
        ...config.filters,
        ...envConfig.filters
      },
      visualization: {
        ...config.visualization,
        ...envConfig.visualization
      },
      performance: {
        ...config.performance,
        ...envConfig.performance
      },
      report: {
        ...config.report,
        ...envConfig.report
      }
    }
  }
}