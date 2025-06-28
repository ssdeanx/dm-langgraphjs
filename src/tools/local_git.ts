import { tool } from "@langchain/core/tools";
import { z } from "zod";
import simpleGit, { SimpleGit } from "simple-git";
import { createFsFromVolume, Volume } from "memfs";

/**
 * In-memory file system for sandboxed Git operations.
 * @type {Volume}
 */
const vol = new Volume();
const ifs = createFsFromVolume(vol);

/**
 * Initializes a simple-git instance with the in-memory file system.
 * @returns {SimpleGit} A simple-git instance configured for in-memory operations.
 */
function getInMemoryGit(): SimpleGit {
  return simpleGit({
    fs: ifs,
    baseDir: "/", // Root of the in-memory file system
  });
}

/**
 * @module LocalGitTools
 * @description A collection of tools for performing Git operations on an in-memory file system.
 */

/**
 * Clones a Git repository into the in-memory file system.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.repoUrl - The URL of the repository to clone.
 * @param {string} [input.branch] - The specific branch to clone. Defaults to the default branch.
 * @returns {Promise<string>} A success message or an error message.
 */
export const cloneRepositoryTool = tool(
  async ({ repoUrl, branch }) => {
    const git = getInMemoryGit();
    try {
      // Clear previous content in the in-memory file system
      vol.reset();
      await git.clone(repoUrl, "/repo", branch ? ["--branch", branch] : []);
      return `Repository ${repoUrl} cloned successfully into in-memory file system.`;
    } catch (error: any) {
      console.error("Error cloning repository:", error);
      return `Error cloning repository: ${error.message}`;
    }
  },
  {
    name: "clone_repository",
    description: "Clones a Git repository into an in-memory file system for analysis.",
    schema: z.object({
      repoUrl: z.string().describe("The URL of the repository to clone."),
      branch: z.string().optional().describe("The specific branch to clone."),
    }),
  }
);

/**
 * Reads the content of a file from the in-memory file system.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.filePath - The path to the file within the in-memory file system (e.g., '/repo/README.md').
 * @returns {Promise<string>} The content of the file as a string.
 */
export const readInMemoryFileTool = tool(
  async ({ filePath }) => {
    try {
      const content = await ifs.promises.readFile(filePath, "utf-8");
      return content as string;
    } catch (error: any) {
      console.error("Error reading in-memory file:", error);
      return `Error reading in-memory file: ${error.message}`;
    }
  },
  {
    name: "read_in_memory_file",
    description: "Reads the content of a file from the in-memory cloned repository.",
    schema: z.object({
      filePath: z.string().describe("The path to the file within the in-memory cloned repository (e.g., '/repo/README.md')."),
    }),
  }
);

/**
 * Lists files and directories within the in-memory file system.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.path - The path to the directory to list (e.g., '/repo/').
 * @returns {Promise<string>} A JSON string of file and directory names.
 */
export const listInMemoryFilesTool = tool(
  async ({ path }) => {
    try {
      const files = await ifs.promises.readdir(path);
      return JSON.stringify(files);
    } catch (error: any) {
      console.error("Error listing in-memory files:", error);
      return `Error listing in-memory files: ${error.message}`;
    }
  },
  {
    name: "list_in_memory_files",
    description: "Lists files and directories within the in-memory cloned repository.",
    schema: z.object({
      path: z.string().describe("The path to the directory to list (e.g., '/repo/')."),
    }),
  }
);

/**
 * Gets file statistics from the in-memory file system.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.filePath - The path to the file within the in-memory file system.
 * @returns {Promise<string>} A JSON string of file statistics.
 */
export const getInMemoryFileStatsTool = tool(
  async ({ filePath }) => {
    try {
      const stats = await ifs.promises.stat(filePath);
      return JSON.stringify({
        size: stats.size,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        // Add more stats as needed
      });
    } catch (error: any) {
      console.error("Error getting in-memory file stats:", error);
      return `Error getting in-memory file stats: ${error.message}`;
    }
  },
  {
    name: "get_in_memory_file_stats",
    description: "Gets file statistics (size, type, etc.) from the in-memory cloned repository.",
    schema: z.object({
      filePath: z.string().describe("The path to the file within the in-memory file system."),
    }),
  }
);

/**
 * Commits changes to the in-memory Git repository.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.message - The commit message.
 * @returns {Promise<string>} A success message or an error message.
 */
export const commitInMemoryChangesTool = tool(
  async ({ message }) => {
    const git = getInMemoryGit();
    try {
      await git.addConfig("user.email", "agent@example.com");
      await git.addConfig("user.name", "LangGraph Agent");
      await git.add("."); // Stage all changes
      const commitResult = await git.commit(message);
      return `Changes committed to in-memory repository: ${commitResult.commit}`;
    } catch (error: any) {
      console.error("Error committing in-memory changes:", error);
      return `Error committing in-memory changes: ${error.message}`;
    }
  },
  {
    name: "commit_in_memory_changes",
    description: "Commits changes to the in-memory Git repository.",
    schema: z.object({
      message: z.string().describe("The commit message."),
    }),
  }
);

/**
 * Gets the commit log of the in-memory Git repository.
 * @function
 * @param {object} input - The input object.
 * @param {number} [input.maxCount=10] - The maximum number of log entries to return.
 * @returns {Promise<string>} A JSON string of commit log entries.
 */
export const getInMemoryLogTool = tool(
  async ({ maxCount = 10 }) => {
    const git = getInMemoryGit();
    try {
      const log = await git.log({
        maxCount,
      });
      return JSON.stringify(log.all);
    } catch (error: any) {
      console.error("Error getting in-memory log:", error);
      return `Error getting in-memory log: ${error.message}`;
    }
  },
  {
    name: "get_in_memory_log",
    description: "Gets the commit log of the in-memory Git repository.",
    schema: z.object({
      maxCount: z.number().int().min(1).optional().describe("The maximum number of log entries to return."),
    }),
  }
);

/**
 * Checks out a specific branch in the in-memory Git repository.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.branchName - The name of the branch to checkout.
 * @returns {Promise<string>} A success message or an error message.
 */
export const checkoutInMemoryBranchTool = tool(
  async ({ branchName }) => {
    const git = getInMemoryGit();
    try {
      await git.checkout(branchName);
      return `Checked out branch: ${branchName}.`;
    } catch (error: any) {
      console.error("Error checking out in-memory branch:", error);
      return `Error checking out in-memory branch: ${error.message}`;
    }
  },
  {
    name: "checkout_in_memory_branch",
    description: "Checks out a specific branch in the in-memory Git repository.",
    schema: z.object({
      branchName: z.string().describe("The name of the branch to checkout."),
    }),
  }
);

/**
 * Creates a new branch in the in-memory Git repository.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.branchName - The name of the new branch.
 * @returns {Promise<string>} A success message or an error message.
 */
export const createInMemoryBranchTool = tool(
  async ({ branchName }) => {
    const git = getInMemoryGit();
    try {
      await git.branch([branchName]);
      return `Created new branch: ${branchName}.`;
    } catch (error: any) {
      console.error("Error creating in-memory branch:", error);
      return `Error creating in-memory branch: ${error.message}`;
    }
  },
  {
    name: "create_in_memory_branch",
    description: "Creates a new branch in the in-memory Git repository.",
    schema: z.object({
      branchName: z.string().describe("The name of the new branch."),
    }),
  }
);

/**
 * Gets the diff between two files or commits in the in-memory Git repository.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.from - The source (e.g., commit hash, branch name, file path).
 * @param {string} input.to - The target (e.g., commit hash, branch name, file path).
 * @returns {Promise<string>} The diff string or an error message.
 */
export const diffInMemoryFilesTool = tool(
  async ({ from, to }) => {
    const git = getInMemoryGit();
    try {
      const diff = await git.diff([from, to]);
      return diff;
    } catch (error: any) {
      console.error("Error getting in-memory diff:", error);
      return `Error getting in-memory diff: ${error.message}`;
    }
  },
  {
    name: "diff_in_memory_files",
    description: "Gets the diff between two files or commits in the in-memory Git repository.",
    schema: z.object({
      from: z.string().describe("The source (e.g., commit hash, branch name, file path)."),
      to: z.string().describe("The target (e.g., commit hash, branch name, file path)."),
    }),
  }
);