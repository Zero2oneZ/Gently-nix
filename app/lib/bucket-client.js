// GentlyOS Bucket Client - Import/Export Hub for Files, Media, and Repos
// Handles software, pictures, video, GitHub repos import with cleanup

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');

// Generate ID
function generateId(prefix = 'bucket') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// Content types
const CONTENT_TYPE = {
  FILE: 'file',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  ARCHIVE: 'archive',
  DOCUMENT: 'document',
  CODE: 'code',
  REPO: 'repo',
  PACKAGE: 'package',
  OTHER: 'other',
};

// Import states
const IMPORT_STATE = {
  PENDING: 'pending',
  DOWNLOADING: 'downloading',
  EXTRACTING: 'extracting',
  PROCESSING: 'processing',
  COMPLETE: 'complete',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// Bucket item
class BucketItem {
  constructor(data = {}) {
    this.id = data.id || generateId('item');
    this.name = data.name;
    this.type = data.type || CONTENT_TYPE.FILE;
    this.source = data.source; // URL, path, or repo URL
    this.destination = data.destination || null;
    this.size = data.size || 0;
    this.state = IMPORT_STATE.PENDING;
    this.progress = 0;
    this.metadata = data.metadata || {};
    this.createdAt = Date.now();
    this.completedAt = null;
    this.error = null;
  }

  // Update progress
  updateProgress(progress) {
    this.progress = Math.min(100, Math.max(0, progress));
    if (this.progress === 100) {
      this.state = IMPORT_STATE.COMPLETE;
      this.completedAt = Date.now();
    }
    return this;
  }

  // Mark complete
  complete(destination) {
    this.state = IMPORT_STATE.COMPLETE;
    this.progress = 100;
    this.destination = destination;
    this.completedAt = Date.now();
    return this;
  }

  // Mark failed
  fail(error) {
    this.state = IMPORT_STATE.FAILED;
    this.error = error;
    return this;
  }

  // Cancel
  cancel() {
    this.state = IMPORT_STATE.CANCELLED;
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      source: this.source,
      destination: this.destination,
      size: this.size,
      state: this.state,
      progress: this.progress,
      metadata: this.metadata,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
      error: this.error,
    };
  }
}

// GitHub repo import
class GitHubImporter {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.cloning = new Map();
  }

  // Parse GitHub URL
  parseUrl(url) {
    // Handles: https://github.com/user/repo, git@github.com:user/repo.git
    const httpsMatch = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    const sshMatch = url.match(/github\.com:([^\/]+)\/([^\.]+)/);

    if (httpsMatch) {
      return { owner: httpsMatch[1], repo: httpsMatch[2] };
    }
    if (sshMatch) {
      return { owner: sshMatch[1], repo: sshMatch[2] };
    }
    return null;
  }

  // Clone repository
  async clone(url, options = {}) {
    const parsed = this.parseUrl(url);
    if (!parsed) {
      return { success: false, error: 'Invalid GitHub URL' };
    }

    const repoDir = path.join(this.baseDir, parsed.owner, parsed.repo);
    const item = new BucketItem({
      name: `${parsed.owner}/${parsed.repo}`,
      type: CONTENT_TYPE.REPO,
      source: url,
      destination: repoDir,
      metadata: { owner: parsed.owner, repo: parsed.repo },
    });

    item.state = IMPORT_STATE.DOWNLOADING;
    this.cloning.set(item.id, item);

    return new Promise((resolve) => {
      // Create directory
      fs.mkdirSync(path.dirname(repoDir), { recursive: true });

      const args = ['clone'];
      if (options.depth) args.push('--depth', String(options.depth));
      if (options.branch) args.push('--branch', options.branch);
      args.push(url, repoDir);

      const proc = spawn('git', args);

      proc.stderr.on('data', (data) => {
        const line = data.toString();
        // Parse git clone progress
        const match = line.match(/Receiving objects:\s+(\d+)%/);
        if (match) {
          item.updateProgress(parseInt(match[1], 10));
        }
      });

      proc.on('close', (code) => {
        if (code === 0) {
          item.complete(repoDir);
          resolve({ success: true, item: item.toJSON() });
        } else {
          item.fail(`Git clone failed with code ${code}`);
          resolve({ success: false, error: item.error, item: item.toJSON() });
        }
        this.cloning.delete(item.id);
      });

      proc.on('error', (err) => {
        item.fail(err.message);
        resolve({ success: false, error: err.message, item: item.toJSON() });
        this.cloning.delete(item.id);
      });
    });
  }

  // Get repo info (without cloning)
  async getInfo(url) {
    const parsed = this.parseUrl(url);
    if (!parsed) {
      return { success: false, error: 'Invalid GitHub URL' };
    }

    return {
      success: true,
      info: {
        owner: parsed.owner,
        repo: parsed.repo,
        url,
        cloneUrl: `https://github.com/${parsed.owner}/${parsed.repo}.git`,
      },
    };
  }

  // List cloned repos
  listCloned() {
    const repos = [];
    try {
      const owners = fs.readdirSync(this.baseDir);
      for (const owner of owners) {
        const ownerPath = path.join(this.baseDir, owner);
        if (fs.statSync(ownerPath).isDirectory()) {
          const repoNames = fs.readdirSync(ownerPath);
          for (const repo of repoNames) {
            const repoPath = path.join(ownerPath, repo);
            if (fs.existsSync(path.join(repoPath, '.git'))) {
              repos.push({
                owner,
                repo,
                path: repoPath,
              });
            }
          }
        }
      }
    } catch (e) {
      // Directory may not exist
    }
    return repos;
  }

  // Remove repo
  async remove(owner, repo) {
    const repoPath = path.join(this.baseDir, owner, repo);
    if (!fs.existsSync(repoPath)) {
      return { success: false, error: 'Repo not found' };
    }

    try {
      fs.rmSync(repoPath, { recursive: true, force: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// File importer
class FileImporter {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.categories = {
      images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
      videos: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv'],
      audio: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'],
      documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'],
      archives: ['zip', 'tar', 'gz', 'rar', '7z', 'bz2'],
      code: ['js', 'ts', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'rb', 'php'],
    };
  }

  // Detect content type from file
  detectType(filePath) {
    const ext = path.extname(filePath).toLowerCase().slice(1);

    for (const [type, extensions] of Object.entries(this.categories)) {
      if (extensions.includes(ext)) {
        return type === 'images' ? CONTENT_TYPE.IMAGE :
               type === 'videos' ? CONTENT_TYPE.VIDEO :
               type === 'audio' ? CONTENT_TYPE.AUDIO :
               type === 'documents' ? CONTENT_TYPE.DOCUMENT :
               type === 'archives' ? CONTENT_TYPE.ARCHIVE :
               type === 'code' ? CONTENT_TYPE.CODE :
               CONTENT_TYPE.FILE;
      }
    }
    return CONTENT_TYPE.OTHER;
  }

  // Get category folder
  getCategoryFolder(type) {
    switch (type) {
      case CONTENT_TYPE.IMAGE: return 'images';
      case CONTENT_TYPE.VIDEO: return 'videos';
      case CONTENT_TYPE.AUDIO: return 'audio';
      case CONTENT_TYPE.DOCUMENT: return 'documents';
      case CONTENT_TYPE.ARCHIVE: return 'archives';
      case CONTENT_TYPE.CODE: return 'code';
      case CONTENT_TYPE.PACKAGE: return 'packages';
      default: return 'misc';
    }
  }

  // Import file
  async importFile(sourcePath, options = {}) {
    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: 'Source file not found' };
    }

    const stats = fs.statSync(sourcePath);
    const type = this.detectType(sourcePath);
    const categoryFolder = this.getCategoryFolder(type);
    const destDir = path.join(this.baseDir, categoryFolder);

    fs.mkdirSync(destDir, { recursive: true });

    const fileName = options.rename || path.basename(sourcePath);
    const destPath = path.join(destDir, fileName);

    const item = new BucketItem({
      name: fileName,
      type,
      source: sourcePath,
      destination: destPath,
      size: stats.size,
    });

    try {
      item.state = IMPORT_STATE.PROCESSING;

      if (options.move) {
        fs.renameSync(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }

      item.complete(destPath);
      return { success: true, item: item.toJSON() };
    } catch (error) {
      item.fail(error.message);
      return { success: false, error: error.message, item: item.toJSON() };
    }
  }

  // Import directory
  async importDirectory(sourceDir, options = {}) {
    if (!fs.existsSync(sourceDir)) {
      return { success: false, error: 'Source directory not found' };
    }

    const results = [];
    const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile()) {
        const result = await this.importFile(
          path.join(sourceDir, entry.name),
          options
        );
        results.push(result);
      } else if (entry.isDirectory() && options.recursive) {
        const subResults = await this.importDirectory(
          path.join(sourceDir, entry.name),
          options
        );
        results.push(...subResults.items || []);
      }
    }

    return {
      success: true,
      items: results,
      total: results.length,
    };
  }

  // List imported files
  listImported(category = null) {
    const results = [];
    const categories = category ? [category] : Object.keys(this.categories);

    for (const cat of categories) {
      const catDir = path.join(this.baseDir, cat);
      if (fs.existsSync(catDir)) {
        const files = fs.readdirSync(catDir);
        for (const file of files) {
          const filePath = path.join(catDir, file);
          const stats = fs.statSync(filePath);
          results.push({
            name: file,
            path: filePath,
            category: cat,
            size: stats.size,
            modified: stats.mtime,
          });
        }
      }
    }

    return results;
  }
}

// Cleanup manager
class CleanupManager {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.trashDir = path.join(baseDir, '.trash');
    this.retentionDays = 7;
  }

  // Move to trash
  moveToTrash(filePath) {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }

    fs.mkdirSync(this.trashDir, { recursive: true });

    const fileName = path.basename(filePath);
    const trashPath = path.join(this.trashDir, `${Date.now()}_${fileName}`);

    try {
      fs.renameSync(filePath, trashPath);
      return { success: true, trashedPath: trashPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Restore from trash
  restoreFromTrash(trashedPath, originalPath = null) {
    if (!fs.existsSync(trashedPath)) {
      return { success: false, error: 'Trashed file not found' };
    }

    // Extract original name
    const fileName = path.basename(trashedPath).replace(/^\d+_/, '');
    const destPath = originalPath || path.join(this.baseDir, fileName);

    try {
      fs.renameSync(trashedPath, destPath);
      return { success: true, restoredPath: destPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Empty trash
  emptyTrash() {
    if (!fs.existsSync(this.trashDir)) {
      return { success: true, deleted: 0 };
    }

    try {
      const files = fs.readdirSync(this.trashDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.trashDir, file));
      }
      return { success: true, deleted: files.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Clean old trash items
  cleanOldTrash() {
    if (!fs.existsSync(this.trashDir)) {
      return { success: true, deleted: 0 };
    }

    const now = Date.now();
    const maxAge = this.retentionDays * 24 * 60 * 60 * 1000;
    let deleted = 0;

    try {
      const files = fs.readdirSync(this.trashDir);
      for (const file of files) {
        const match = file.match(/^(\d+)_/);
        if (match) {
          const timestamp = parseInt(match[1], 10);
          if (now - timestamp > maxAge) {
            fs.unlinkSync(path.join(this.trashDir, file));
            deleted++;
          }
        }
      }
      return { success: true, deleted };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // List trash
  listTrash() {
    if (!fs.existsSync(this.trashDir)) {
      return [];
    }

    try {
      return fs.readdirSync(this.trashDir).map(file => {
        const match = file.match(/^(\d+)_(.+)$/);
        return {
          trashedPath: path.join(this.trashDir, file),
          originalName: match ? match[2] : file,
          trashedAt: match ? parseInt(match[1], 10) : Date.now(),
        };
      });
    } catch (e) {
      return [];
    }
  }

  // Calculate disk usage
  getDiskUsage() {
    const usage = {
      total: 0,
      byCategory: {},
      trash: 0,
    };

    try {
      const categories = fs.readdirSync(this.baseDir);
      for (const cat of categories) {
        if (cat === '.trash') continue;
        const catPath = path.join(this.baseDir, cat);
        if (fs.statSync(catPath).isDirectory()) {
          const files = fs.readdirSync(catPath);
          let catSize = 0;
          for (const file of files) {
            const stats = fs.statSync(path.join(catPath, file));
            catSize += stats.size;
          }
          usage.byCategory[cat] = catSize;
          usage.total += catSize;
        }
      }

      // Trash size
      if (fs.existsSync(this.trashDir)) {
        const trashFiles = fs.readdirSync(this.trashDir);
        for (const file of trashFiles) {
          usage.trash += fs.statSync(path.join(this.trashDir, file)).size;
        }
      }
    } catch (e) {
      // Ignore errors
    }

    return usage;
  }
}

// Main Bucket Client
class BucketClient extends EventEmitter {
  constructor(baseDir = null) {
    super();
    this.baseDir = baseDir || path.join(process.env.HOME || '/home/gently', '.gently', 'bucket');
    this.reposDir = path.join(this.baseDir, 'repos');

    // Initialize directories
    fs.mkdirSync(this.baseDir, { recursive: true });
    fs.mkdirSync(this.reposDir, { recursive: true });

    this.gitHub = new GitHubImporter(this.reposDir);
    this.files = new FileImporter(this.baseDir);
    this.cleanup = new CleanupManager(this.baseDir);
    this.queue = [];
    this.history = [];
    this.maxHistory = 500;
  }

  // Import from URL
  async importUrl(url, options = {}) {
    if (url.includes('github.com')) {
      const result = await this.gitHub.clone(url, options);
      this.addToHistory('repo', url, result.success);
      this.emit('import', { type: 'repo', url, result });
      return result;
    }

    // For other URLs, would need fetch implementation
    return { success: false, error: 'URL type not supported yet' };
  }

  // Import local file
  async importFile(filePath, options = {}) {
    const result = await this.files.importFile(filePath, options);
    this.addToHistory('file', filePath, result.success);
    this.emit('import', { type: 'file', path: filePath, result });
    return result;
  }

  // Import directory
  async importDirectory(dirPath, options = {}) {
    const result = await this.files.importDirectory(dirPath, options);
    this.addToHistory('directory', dirPath, result.success);
    this.emit('import', { type: 'directory', path: dirPath, result });
    return result;
  }

  // Clone GitHub repo
  async cloneRepo(url, options = {}) {
    return this.importUrl(url, options);
  }

  // Get repo info
  getRepoInfo(url) {
    return this.gitHub.getInfo(url);
  }

  // List cloned repos
  listRepos() {
    return {
      success: true,
      repos: this.gitHub.listCloned(),
    };
  }

  // Remove repo
  async removeRepo(owner, repo) {
    const result = await this.gitHub.remove(owner, repo);
    if (result.success) {
      this.addToHistory('remove-repo', `${owner}/${repo}`, true);
      this.emit('removed', { type: 'repo', owner, repo });
    }
    return result;
  }

  // List imported files
  listFiles(category = null) {
    return {
      success: true,
      files: this.files.listImported(category),
    };
  }

  // Delete file (move to trash)
  deleteFile(filePath) {
    const result = this.cleanup.moveToTrash(filePath);
    if (result.success) {
      this.addToHistory('delete', filePath, true);
      this.emit('deleted', { path: filePath });
    }
    return result;
  }

  // Restore from trash
  restoreFile(trashedPath, originalPath = null) {
    return this.cleanup.restoreFromTrash(trashedPath, originalPath);
  }

  // List trash
  listTrash() {
    return {
      success: true,
      items: this.cleanup.listTrash(),
    };
  }

  // Empty trash
  emptyTrash() {
    const result = this.cleanup.emptyTrash();
    if (result.success) {
      this.emit('trash-emptied', { deleted: result.deleted });
    }
    return result;
  }

  // Clean old trash
  cleanOldTrash() {
    return this.cleanup.cleanOldTrash();
  }

  // Get disk usage
  getDiskUsage() {
    return {
      success: true,
      usage: this.cleanup.getDiskUsage(),
    };
  }

  // Add to history
  addToHistory(type, source, success) {
    this.history.unshift({
      id: generateId('hist'),
      type,
      source,
      success,
      timestamp: Date.now(),
    });
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory);
    }
  }

  // Get history
  getHistory(limit = 50) {
    return {
      success: true,
      history: this.history.slice(0, limit),
    };
  }

  // Clear history
  clearHistory() {
    this.history = [];
    return { success: true };
  }

  // Get stats
  getStats() {
    return {
      success: true,
      stats: {
        baseDir: this.baseDir,
        repoCount: this.gitHub.listCloned().length,
        fileCount: this.files.listImported().length,
        trashCount: this.cleanup.listTrash().length,
        historySize: this.history.length,
        diskUsage: this.cleanup.getDiskUsage(),
      },
    };
  }

  // Set base directory
  setBaseDir(dir) {
    this.baseDir = dir;
    this.reposDir = path.join(dir, 'repos');
    fs.mkdirSync(this.baseDir, { recursive: true });
    fs.mkdirSync(this.reposDir, { recursive: true });
    this.gitHub = new GitHubImporter(this.reposDir);
    this.files = new FileImporter(this.baseDir);
    this.cleanup = new CleanupManager(this.baseDir);
    return { success: true, baseDir: this.baseDir };
  }
}

module.exports = {
  BucketClient,
  BucketItem,
  GitHubImporter,
  FileImporter,
  CleanupManager,
  CONTENT_TYPE,
  IMPORT_STATE,
};
