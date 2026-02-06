# GentlyOS Phase 8 Rust Crate Integrations API Reference

This document provides comprehensive documentation for the Phase 8 JavaScript client modules that interface with the underlying Rust crate implementations in GentlyOS.

---

## Table of Contents

1. [Artisan Client - Toroidal Knowledge Storage](#1-artisan-client---toroidal-knowledge-storage)
2. [Architect Client - Idea Crystallization](#2-architect-client---idea-crystallization)
3. [Behavior Client - Adaptive UI Learning](#3-behavior-client---adaptive-ui-learning)
4. [Network Client - Security Visualization](#4-network-client---security-visualization)
5. [Sploit Client - Security Testing](#5-sploit-client---security-testing)
6. [Commerce Client - Vibe Commerce](#6-commerce-client---vibe-commerce)
7. [Dance Client - Device Pairing](#7-dance-client---device-pairing)
8. [Tier Gate - Feature Access Control](#8-tier-gate---feature-access-control)
9. [Preload API Reference](#9-preload-api-reference)

---

## 1. Artisan Client - Toroidal Knowledge Storage

### Overview

The Artisan Client implements a toroidal knowledge storage system based on topological mathematics. Knowledge is stored on the surface of interconnected tori (plural of torus), where:

- **Torus**: A donut-shaped surface representing a knowledge unit
- **Foam**: A collection of interconnected tori
- **Blend**: A connection between two tori at specific points
- **BARF (Bark And Retrieve Foam)**: XOR-based search mechanism

The system uses geometric metaphors to organize and relate knowledge:
- **Major Radius**: Represents the scope or domain of knowledge
- **Minor Radius**: Represents tokens spent (investment in the concept)
- **Winding Level**: Represents refinement stage (1=raw to 6=production)
- **BS Score**: Bullshit score (1.0=unvalidated to 0.0=fully validated)

### Tier Requirements

| Feature | Tier | Min HW Score | Bridge Required |
|---------|------|--------------|-----------------|
| `artisan.view` | Free | - | No |
| `artisan.create` | Basic | - | No |
| `artisan.refine` | Basic | - | No |
| `artisan.blend` | Pro | - | No |
| `artisan.query` | Pro | - | No |
| `artisan.traverse` | Pro | - | No |
| `artisan.foam` | Dev | - | No |
| `artisan.export` | Dev | - | No |
| `artisan.render` | Dev | 25 | No |

### Classes

#### TorusCoordinate

Represents an angular position on a torus surface.

| Property | Type | Description |
|----------|------|-------------|
| `theta` | number | Major angle (0 to 2*PI) |
| `phi` | number | Minor angle (0 to 2*PI) |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `normalizeAngle(angle)` | number | number | Normalizes angle to 0-2*PI range |
| `toJSON()` | - | object | Serializes to JSON |
| `static fromJSON(json)` | object | TorusCoordinate | Deserializes from JSON |
| `static default()` | - | TorusCoordinate | Returns (0, 0) coordinate |

#### TorusPoint

Represents a point on a torus surface with content hash.

| Property | Type | Description |
|----------|------|-------------|
| `coord` | TorusCoordinate | Position on torus |
| `contentHash` | string | SHA-256 hash of associated content |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `distanceTo(other)` | TorusPoint | number | Angular distance to another point |
| `toJSON()` | - | object | Serializes to JSON |
| `static fromJSON(json)` | object | TorusPoint | Deserializes from JSON |

#### Torus

The core knowledge unit - a topological surface for storing knowledge.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier (hash-based) |
| `label` | string | Human-readable name |
| `majorRadius` | number | Scope/domain size (default 1.0) |
| `minorRadius` | number | Calculated from tokens spent |
| `tokensSpent` | number | Investment in this concept |
| `winding` | number | Refinement level (1-6) |
| `bs` | number | Bullshit score (0.0-1.0) |
| `parent` | string | Parent torus ID |
| `createdAt` | number | Creation timestamp |
| `modifiedAt` | number | Last modification timestamp |
| `points` | TorusPoint[] | Points on the torus surface |
| `metadata` | object | Additional metadata |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `addTokens(tokens)` | number | Torus | Increases minor radius |
| `refine()` | - | Torus | Increases winding level |
| `validate(score)` | number | Torus | Updates BS score (0-1) |
| `addPoint(major, minor, hash)` | number, number, string | TorusPoint | Adds point to surface |
| `getWindingName()` | - | string | Returns winding level name |
| `toJSON()` | - | object | Serializes to JSON |
| `static fromJSON(json)` | object | Torus | Deserializes from JSON |

#### TorusBlend

Connection between two tori.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `torusA` | string | First torus ID |
| `torusB` | string | Second torus ID |
| `pointA` | TorusCoordinate | Connection point on A |
| `pointB` | TorusCoordinate | Connection point on B |
| `strength` | number | Connection strength (0-1) |
| `createdAt` | number | Creation timestamp |
| `lastUsed` | number | Last usage timestamp |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `connects(torusId)` | string | boolean | Checks if blend connects torus |
| `other(torusId)` | string | string | Gets other torus in blend |
| `decay(factor)` | number | TorusBlend | Decays strength over time |
| `boost(amount)` | number | TorusBlend | Boosts strength |
| `toJSON()` | - | object | Serializes to JSON |
| `static fromJSON(json)` | object | TorusBlend | Deserializes from JSON |
| `static simple(a, b, strength)` | string, string, number | TorusBlend | Creates simple blend |

#### Foam

Multi-torus interconnected memory structure.

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Foam name |
| `tori` | Map | ID to Torus mapping |
| `blends` | TorusBlend[] | Inter-torus connections |
| `metadata` | object | Creation/modification timestamps |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `addTorus(torus)` | Torus | Torus | Adds torus to foam |
| `getTorus(id)` | string | Torus | Gets torus by ID |
| `removeTorus(id)` | string | boolean | Removes torus and related blends |
| `listTori()` | - | object[] | Lists all tori as JSON |
| `addBlend(blend)` | TorusBlend | TorusBlend | Adds blend (validates tori exist) |
| `blend(idA, idB, strength)` | string, string, number | TorusBlend | Creates and adds blend |
| `getBlendsFor(torusId)` | string | TorusBlend[] | Gets blends for torus |
| `getNeighbors(torusId)` | string | Torus[] | Gets connected tori |
| `traverse(start, end, maxDepth)` | string, string, number | string[] | BFS pathfinding |
| `decayAll(factor)` | number | void | Decays all blends |
| `stats()` | - | object | Returns foam statistics |
| `toJSON()` | - | object | Serializes to JSON |
| `static fromJSON(json)` | object | Foam | Deserializes from JSON |

#### BarfQuery

BARF (Bark And Retrieve Foam) search query.

| Property | Type | Description |
|----------|------|-------------|
| `queryVector` | any | Search term or embedding |
| `xorKey` | string | Optional XOR key for encrypted search |
| `timestamp` | number | Query timestamp |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `execute(foam)` | Foam | object | Executes search against foam |
| `static bestMatch(results)` | object | object | Gets best match from results |

#### ArtisanClient

Main client for toroidal knowledge storage.

| Property | Type | Description |
|----------|------|-------------|
| `foams` | Map | Name to Foam mapping |
| `activeFoam` | Foam | Currently active foam |
| `defaultFoamName` | string | Default foam name ("knowledge") |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `init()` | - | object | Initializes default foam |
| `createFoam(name)` | string | object | Creates new foam |
| `setActiveFoam(name)` | string | object | Switches active foam |
| `getActiveFoam()` | - | Foam | Gets active foam |
| `createTorus(label, major, tokens)` | string, number, number | object | Creates torus |
| `getTorus(torusId)` | string | object | Gets torus by ID |
| `listTori()` | - | object | Lists all tori |
| `addTokens(torusId, tokens)` | string, number | object | Adds tokens to torus |
| `refineTorus(torusId)` | string | object | Refines torus winding |
| `validateTorus(torusId, bsScore)` | string, number | object | Updates BS score |
| `addPoint(torusId, major, minor, hash)` | string, number, number, string | object | Adds point to torus |
| `blendTori(idA, idB, strength)` | string, string, number | object | Creates blend |
| `getNeighbors(torusId)` | string | object | Gets neighbor tori |
| `traverse(startId, endId, maxDepth)` | string, string, number | object | Finds path between tori |
| `query(queryVector, xorKey)` | any, string | object | BARF search |
| `decayBlends(factor)` | number | object | Decays all blends |
| `boostBlend(blendId, amount)` | string, number | object | Boosts specific blend |
| `stats()` | - | object | Gets foam statistics |
| `exportFoam()` | - | object | Exports foam to JSON |
| `importFoam(data)` | object | object | Imports foam from JSON |
| `renderFoam()` | - | object | Renders foam for visualization |

### Constants

```javascript
const WINDING_LEVELS = {
  RAW_IDEA: 1,
  STRUCTURED: 2,
  REFINED: 3,
  TESTED: 4,
  DOCUMENTED: 5,
  PRODUCTION: 6,
};
```

### Preload API - window.gently.artisan

| Method | Parameters | Description |
|--------|------------|-------------|
| `createTorus(label, majorRadius, tokensSpent)` | string, number, number | Creates new torus |
| `getTorus(torusId)` | string | Gets torus by ID |
| `listTori()` | - | Lists all tori |
| `addTokens(torusId, tokens)` | string, number | Adds tokens to torus |
| `refine(torusId)` | string | Refines torus winding level |
| `validate(torusId, bsScore)` | string, number | Updates BS score |
| `addPoint(torusId, major, minor, hash)` | string, number, number, string | Adds point |
| `blend(torusIdA, torusIdB, strength)` | string, string, number | Creates blend |
| `getNeighbors(torusId)` | string | Gets neighbor tori |
| `decayBlends(factor)` | number | Decays all blends |
| `boostBlend(blendId, amount)` | string, number | Boosts blend |
| `traverse(startId, endId, maxDepth)` | string, string, number | Finds path |
| `query(queryVector, xorKey)` | any, string | BARF search |
| `createFoam(name)` | string | Creates new foam |
| `setFoam(name)` | string | Sets active foam |
| `stats()` | - | Gets statistics |
| `render()` | - | Renders for visualization |
| `export()` | - | Exports foam |
| `import(data)` | object | Imports foam |
| `windingLevels()` | - | Gets winding level constants |

### Usage Examples

```javascript
// Initialize and create a torus
const result = await window.gently.artisan.createTorus('machine-learning', 1.0, 100);
const torusId = result.torus.id;

// Add more tokens (increases minor radius)
await window.gently.artisan.addTokens(torusId, 500);

// Refine the concept
await window.gently.artisan.refine(torusId);

// Validate the concept (lower BS score = more validated)
await window.gently.artisan.validate(torusId, 0.3);

// Create another torus and blend them
const related = await window.gently.artisan.createTorus('neural-networks', 1.0, 200);
await window.gently.artisan.blend(torusId, related.torus.id, 0.7);

// Search the knowledge foam
const searchResults = await window.gently.artisan.query('neural');

// Get visualization data
const vizData = await window.gently.artisan.render();
console.log(vizData.nodes, vizData.edges);
```

---

## 2. Architect Client - Idea Crystallization

### Overview

The Architect Client implements an idea crystallization engine that tracks ideas from initial capture through to implementation. Ideas progress through states:

1. **Spoken**: Initial raw capture
2. **Embedded**: Has embedding/context added
3. **Confirmed**: Validated/reviewed
4. **Crystallized**: Linked to code/files

The system also manages project trees and provides recall/suggestion capabilities.

### Tier Requirements

| Feature | Tier | Min HW Score | Bridge Required |
|---------|------|--------------|-----------------|
| `architect.ideas` | Basic | - | No |
| `architect.embed` | Basic | - | No |
| `architect.confirm` | Basic | - | No |
| `architect.crystallize` | Pro | - | No |
| `architect.tree` | Pro | - | No |
| `architect.recall` | Pro | 25 | No |
| `architect.flowchart` | Dev | 50 | No |
| `architect.export` | Dev | - | No |

### Classes

#### IdeaScore

Scoring components for an idea.

| Property | Type | Description |
|----------|------|-------------|
| `clarity` | number | How clear the idea is (0-100) |
| `feasibility` | number | How feasible to implement (0-100) |
| `impact` | number | Potential impact (0-100) |
| `completeness` | number | How complete the specification (0-100) |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `overall()` | - | number | Average of all scores |
| `toJSON()` | - | object | Serializes to JSON |
| `static fromJSON(json)` | object | IdeaScore | Deserializes from JSON |

#### IdeaCrystal

Core idea representation.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `content` | string | Idea content text |
| `state` | string | Current state (spoken/embedded/confirmed/crystallized) |
| `embedding` | any | Vector embedding if available |
| `chain` | string[] | Doc chain IDs this idea participates in |
| `sourceFile` | string | Crystallized location |
| `parent` | string | Parent idea ID |
| `children` | string[] | Child idea IDs |
| `connections` | string[] | Connected idea IDs |
| `score` | IdeaScore | Scoring components |
| `tags` | string[] | Tags for categorization |
| `createdAt` | number | Creation timestamp |
| `modifiedAt` | number | Last modification timestamp |
| `metadata` | object | Additional metadata |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `embed(embedding, chain)` | any, string[] | IdeaCrystal | Adds embedding and transitions to embedded |
| `confirm()` | - | IdeaCrystal | Transitions to confirmed |
| `crystallize(sourceFile)` | string | IdeaCrystal | Links to code, transitions to crystallized |
| `branch(newContent)` | string | IdeaCrystal | Creates child idea |
| `connect(otherId)` | string | IdeaCrystal | Connects to another idea |
| `setScore(c, f, i, comp)` | number, number, number, number | IdeaCrystal | Sets score components |
| `toJSON()` | - | object | Serializes to JSON |
| `static fromJSON(json)` | object | IdeaCrystal | Deserializes from JSON |

#### TreeNode

Project tree node (file or directory).

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Node name |
| `type` | string | 'file' or 'directory' |
| `language` | string | Programming language (for files) |
| `children` | string[] | Child node IDs |
| `linkedIdeas` | string[] | Linked idea IDs |
| `metadata` | object | Additional metadata |

#### ProjectTree

Project file/directory tree.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Project name |
| `rootPath` | string | Root filesystem path |
| `nodes` | Map | ID to TreeNode mapping |
| `root` | string | Root node ID |
| `createdAt` | number | Creation timestamp |
| `modifiedAt` | number | Last modification timestamp |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `createRoot()` | - | TreeNode | Creates root directory |
| `addDirectory(name, parentId)` | string, string | TreeNode | Adds directory |
| `addFile(name, parentId, language)` | string, string, string | TreeNode | Adds file |
| `getNode(nodeId)` | string | TreeNode | Gets node by ID |
| `linkIdea(nodeId, ideaId)` | string, string | TreeNode | Links idea to node |
| `listFiles()` | - | object[] | Lists all files |
| `render(nodeId, depth)` | string, number | object[] | Renders tree structure |
| `toJSON()` | - | object | Serializes to JSON |
| `static fromJSON(json)` | object | ProjectTree | Deserializes from JSON |

#### RecallEngine

Memory recall and suggestion engine.

| Property | Type | Description |
|----------|------|-------------|
| `history` | object[] | Query history |
| `cache` | Map | Query to results cache |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `similarity(textA, textB)` | string, string | number | Jaccard similarity |
| `recall(ideas, query, limit)` | IdeaCrystal[], string, number | object | Recalls matching ideas |
| `suggestConnections(ideas, limit)` | IdeaCrystal[], number | object[] | Suggests connections |
| `rankIdeas(ideas, limit)` | IdeaCrystal[], number | object[] | Ranks ideas by quality |

#### ArchitectClient

Main client for idea crystallization.

| Property | Type | Description |
|----------|------|-------------|
| `ideas` | Map | ID to IdeaCrystal mapping |
| `trees` | Map | ID to ProjectTree mapping |
| `activeTree` | ProjectTree | Currently active tree |
| `recall` | RecallEngine | Recall engine instance |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `init()` | - | object | Initializes client |
| `createIdea(content, tags)` | string, string[] | object | Creates new idea |
| `getIdea(ideaId)` | string | object | Gets idea by ID |
| `listIdeas(state)` | string | object | Lists ideas (optionally filtered) |
| `embedIdea(ideaId, embedding, chain)` | string, any, string[] | object | Embeds idea |
| `confirmIdea(ideaId)` | string | object | Confirms idea |
| `crystallizeIdea(ideaId, sourceFile)` | string, string | object | Crystallizes idea |
| `branchIdea(ideaId, newContent)` | string, string | object | Branches from idea |
| `connectIdeas(ideaA, ideaB)` | string, string | object | Connects two ideas |
| `scoreIdea(ideaId, c, f, i, comp)` | string, number, number, number, number | object | Scores idea |
| `tagIdea(ideaId, tags)` | string, string[] | object | Tags idea |
| `createTree(name, rootPath)` | string, string | object | Creates project tree |
| `setActiveTree(treeId)` | string | object | Sets active tree |
| `getActiveTree()` | - | object | Gets active tree |
| `listTrees()` | - | object | Lists all trees |
| `addDirectory(name, parentId)` | string, string | object | Adds directory |
| `addFile(name, parentId, language)` | string, string, string | object | Adds file |
| `linkIdeaToNode(nodeId, ideaId)` | string, string | object | Links idea to tree node |
| `renderTree(treeId)` | string | object | Renders tree structure |
| `recallIdeas(query, limit)` | string, number | object | Recalls ideas |
| `suggestConnections(limit)` | number | object | Suggests connections |
| `rankIdeas(limit)` | number | object | Ranks ideas |
| `flowchart(rootIdeaId)` | string | object | Generates flowchart data |
| `exportAll()` | - | object | Exports all data |
| `importAll(data)` | object | object | Imports data |
| `stats()` | - | object | Gets statistics |

### Constants

```javascript
const IDEA_STATES = {
  SPOKEN: 'spoken',
  EMBEDDED: 'embedded',
  CONFIRMED: 'confirmed',
  CRYSTALLIZED: 'crystallized',
};
```

### Preload API - window.gently.architect

| Method | Parameters | Description |
|--------|------------|-------------|
| `createIdea(content, tags)` | string, string[] | Creates new idea |
| `getIdea(ideaId)` | string | Gets idea by ID |
| `listIdeas(state)` | string | Lists ideas |
| `embedIdea(ideaId, embedding, chain)` | string, any, string[] | Embeds idea |
| `confirmIdea(ideaId)` | string | Confirms idea |
| `crystallizeIdea(ideaId, sourceFile)` | string, string | Crystallizes idea |
| `branchIdea(ideaId, newContent)` | string, string | Branches idea |
| `connectIdeas(ideaA, ideaB)` | string, string | Connects ideas |
| `scoreIdea(ideaId, c, f, i, comp)` | string, number, number, number, number | Scores idea |
| `tagIdea(ideaId, tags)` | string, string[] | Tags idea |
| `createTree(name, rootPath)` | string, string | Creates tree |
| `setTree(treeId)` | string | Sets active tree |
| `getTree()` | - | Gets active tree |
| `listTrees()` | - | Lists trees |
| `addDirectory(name, parentId)` | string, string | Adds directory |
| `addFile(name, parentId, language)` | string, string, string | Adds file |
| `linkIdea(nodeId, ideaId)` | string, string | Links idea to node |
| `renderTree(treeId)` | string | Renders tree |
| `recall(query, limit)` | string, number | Recalls ideas |
| `suggest(limit)` | number | Suggests connections |
| `rank(limit)` | number | Ranks ideas |
| `flowchart(rootIdeaId)` | string | Generates flowchart |
| `export()` | - | Exports data |
| `import(data)` | object | Imports data |
| `stats()` | - | Gets statistics |
| `ideaStates()` | - | Gets state constants |

### Usage Examples

```javascript
// Create an idea
const idea = await window.gently.architect.createIdea(
  'Implement user authentication with OAuth2',
  ['auth', 'security', 'feature']
);

// Score the idea
await window.gently.architect.scoreIdea(
  idea.idea.id,
  80,  // clarity
  70,  // feasibility
  90,  // impact
  60   // completeness
);

// Confirm the idea after review
await window.gently.architect.confirmIdea(idea.idea.id);

// Create project tree
const tree = await window.gently.architect.createTree('my-app', '/home/user/projects/my-app');

// Add file and link idea
const file = await window.gently.architect.addFile('auth.js', null, 'javascript');
await window.gently.architect.linkIdea(file.node.id, idea.idea.id);

// Crystallize the idea to the file
await window.gently.architect.crystallizeIdea(idea.idea.id, 'auth.js');

// Search for ideas
const results = await window.gently.architect.recall('authentication', 10);

// Get flowchart visualization data
const flowchart = await window.gently.architect.flowchart();
```

---

## 3. Behavior Client - Adaptive UI Learning

### Overview

The Behavior Client implements an adaptive UI learning system that:

- Observes user actions (clicks, navigation, input, etc.)
- Detects behavioral patterns (chains)
- Predicts next likely actions
- Suggests UI adaptations based on usage patterns

This enables the UI to adapt to individual user workflows over time.

### Tier Requirements

| Feature | Tier | Min HW Score | Bridge Required |
|---------|------|--------------|-----------------|
| `behavior.profile` | Basic | - | No |
| `behavior.predict` | Pro | - | No |
| `behavior.chains` | Pro | 25 | No |
| `behavior.adaptations` | Dev | 50 | No |
| `behavior.export` | Dev | - | No |

### Classes

#### Action

Record of a user action.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `type` | string | Action type (see ACTION_TYPES) |
| `target` | string | Element ID or description |
| `scope` | string | Current scope when action occurred |
| `timestamp` | number | When action occurred |
| `duration` | number | Time spent (for hover, input) |
| `metadata` | object | Additional context |

#### BehavioralChain

Detected sequence pattern.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `actions` | Action[] | Action sequence |
| `count` | number | Times this chain observed |
| `lastSeen` | number | Last observation timestamp |
| `avgDuration` | number | Average time to complete |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `signature()` | - | string | Chain signature for comparison |
| `matches(sequence, partial)` | Action[], boolean | boolean | Matches against action sequence |
| `predictNext(currentSequence)` | Action[] | Action | Predicts next action |
| `toJSON()` | - | object | Serializes to JSON |
| `static fromJSON(json)` | object | BehavioralChain | Deserializes from JSON |

#### Prediction

Prediction result.

| Property | Type | Description |
|----------|------|-------------|
| `action` | Action | Predicted next action |
| `confidence` | number | Confidence score (0-1) |
| `chain` | BehavioralChain | Source chain if from chain prediction |
| `timestamp` | number | Prediction timestamp |

#### Adaptation

UI adaptation suggestion.

| Property | Type | Description |
|----------|------|-------------|
| `type` | string | 'reorder', 'highlight', 'shortcut', 'hide' |
| `target` | string | Element or feature ID |
| `adjustment` | object | Specific change details |
| `confidence` | number | Confidence in suggestion |
| `reason` | string | Why this adaptation was suggested |

#### BehaviorClient

Main client for adaptive UI learning.

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | boolean | Whether learning is enabled |
| `actions` | Action[] | Recent action history |
| `chains` | BehavioralChain[] | Detected behavioral chains |
| `predictions` | Prediction[] | Recent predictions |
| `frequencyMap` | Map | Action type to count |
| `targetMap` | Map | Target to action counts |
| `scopeStats` | Map | Scope to action stats |
| `config` | object | Configuration options |

**Configuration Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minActionsForPrediction` | number | 3 | Minimum actions before predicting |
| `maxChainLength` | number | 5 | Maximum chain length to detect |
| `maxHistorySize` | number | 1000 | Maximum history size |
| `observationDecay` | number | 0.95 | Decay factor for observations |
| `suggestionThreshold` | number | 0.6 | Threshold for suggestions |
| `chainDetectionWindow` | number | 10 | Window for chain detection |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `configure(config)` | object | object | Updates configuration |
| `setEnabled(enabled)` | boolean | object | Enables/disables learning |
| `observe(actionData)` | object | object | Observes a user action |
| `detectChains()` | - | void | Detects chains from recent actions |
| `predictNext()` | - | object | Predicts next action |
| `getChains()` | - | object | Gets detected chains |
| `getAdaptations(level)` | string | object | Gets UI adaptations |
| `getStats()` | - | object | Gets learning statistics |
| `reset()` | - | object | Resets learning state |
| `export()` | - | object | Exports learned data |
| `import(data)` | object | object | Imports learned data |
| `getHistory(limit)` | number | object | Gets recent history |

### Constants

```javascript
const ACTION_TYPES = {
  // Navigation
  NAVIGATE: 'navigate',
  SCROLL: 'scroll',
  SWITCH_SCOPE: 'switch_scope',
  SWITCH_PANE: 'switch_pane',

  // Input
  INPUT: 'input',
  SUBMIT: 'submit',
  SELECT: 'select',
  TOGGLE: 'toggle',

  // Interaction
  CLICK: 'click',
  DOUBLE_CLICK: 'double_click',
  RIGHT_CLICK: 'right_click',
  HOVER: 'hover',
  DRAG: 'drag',
  DROP: 'drop',

  // Commands
  SHORTCUT: 'shortcut',
  COMMAND: 'command',
  TOOL: 'tool',

  // System
  OPEN_MODAL: 'open_modal',
  CLOSE_MODAL: 'close_modal',
  RESIZE: 'resize',
};
```

### Preload API - window.gently.behavior

| Method | Parameters | Description |
|--------|------------|-------------|
| `observe(action)` | object | Observes a user action |
| `predict()` | - | Gets next action predictions |
| `chains()` | - | Gets detected chains |
| `adaptations(level)` | string | Gets UI adaptations |
| `stats()` | - | Gets statistics |
| `reset()` | - | Resets learning state |
| `configure(config)` | object | Updates configuration |
| `setEnabled(enabled)` | boolean | Enables/disables learning |
| `export()` | - | Exports learned data |
| `import(data)` | object | Imports learned data |
| `history(limit)` | number | Gets recent history |
| `actionTypes()` | - | Gets action type constants |

### Usage Examples

```javascript
// Observe user actions
await window.gently.behavior.observe({
  type: 'click',
  target: 'submit-button',
  scope: 'editor',
});

await window.gently.behavior.observe({
  type: 'navigate',
  target: 'settings-page',
  scope: 'editor',
});

// Get next action predictions
const predictions = await window.gently.behavior.predict();
if (predictions.topPrediction) {
  console.log('Predicted next:', predictions.topPrediction.action.type);
  console.log('Confidence:', predictions.topPrediction.confidence);
}

// Get detected behavioral chains
const chains = await window.gently.behavior.chains();
chains.chains.forEach(chain => {
  console.log('Chain:', chain.signature, 'Count:', chain.count);
});

// Get UI adaptations (level: 'basic', 'pro', 'dev')
const adaptations = await window.gently.behavior.adaptations('pro');
adaptations.adaptations.forEach(adapt => {
  console.log('Suggestion:', adapt.type, adapt.target, adapt.reason);
});

// Export learned behavior for backup
const exported = await window.gently.behavior.export();
localStorage.setItem('behaviorData', JSON.stringify(exported.data));

// Import on next session
const saved = JSON.parse(localStorage.getItem('behaviorData'));
await window.gently.behavior.import(saved);
```

---

## 4. Network Client - Security Visualization

### Overview

The Network Client implements a security visualization system that provides:

- **Firewall**: Rule-based connection filtering
- **Monitor**: Network event logging and statistics
- **Capture**: Packet capture sessions
- **Topology**: Network node visualization
- **Proxy**: MITM proxy configuration

### Tier Requirements

| Feature | Tier | Min HW Score | Bridge Required |
|---------|------|--------------|-----------------|
| `network.firewall` | Pro | - | No |
| `network.monitor` | Pro | 25 | No |
| `network.topology` | Pro | - | No |
| `network.capture` | Dev | 50 | No |
| `network.proxy` | Dev | 75 | No |
| `network.export` | Dev | - | No |

### Classes

#### FirewallRule

A firewall rule definition.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Rule name |
| `action` | string | allow/deny/log/reject |
| `enabled` | boolean | Whether rule is active |
| `priority` | number | Lower = higher priority (default 100) |
| `direction` | string | inbound/outbound/both |
| `protocol` | string | tcp/udp/icmp/any |
| `sourceIP` | string | Source IP filter (null = any) |
| `sourcePort` | number | Source port filter |
| `destIP` | string | Destination IP filter |
| `destPort` | number | Destination port filter |
| `createdAt` | number | Creation timestamp |
| `hitCount` | number | Times rule was triggered |
| `lastHit` | number | Last trigger timestamp |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `matches(connection)` | object | boolean | Checks if rule matches connection |
| `ipMatches(ip, pattern)` | string, string | boolean | Checks IP against pattern |
| `toJSON()` | - | object | Serializes to JSON |
| `static fromJSON(json)` | object | FirewallRule | Deserializes from JSON |

#### NetworkEvent

A network event record.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `type` | string | Event type (see EVENT_TYPE) |
| `timestamp` | number | Event timestamp |
| `sourceIP` | string | Source IP address |
| `sourcePort` | number | Source port |
| `destIP` | string | Destination IP address |
| `destPort` | number | Destination port |
| `protocol` | string | Protocol used |
| `direction` | string | Traffic direction |
| `ruleId` | string | Triggered rule ID |
| `action` | string | Action taken |
| `bytes` | number | Bytes transferred |
| `metadata` | object | Additional data |

#### CaptureSession

Packet capture session.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `filter` | object | Filter criteria |
| `startTime` | number | Session start time |
| `endTime` | number | Session end time |
| `active` | boolean | Whether session is active |
| `packets` | object[] | Captured packets |
| `packetCount` | number | Total packets captured |
| `byteCount` | number | Total bytes captured |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `addPacket(packet)` | object | boolean | Adds packet (applies filter) |
| `stop()` | - | void | Stops capture session |
| `toJSON()` | - | object | Serializes to JSON |

#### NetworkNode

Network topology node.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `ip` | string | IP address |
| `type` | string | host/router/server/external/self |
| `hostname` | string | Resolved hostname |
| `ports` | number[] | Open ports |
| `connections` | string[] | Connected node IDs |
| `firstSeen` | number | First observation time |
| `lastSeen` | number | Last observation time |
| `metadata` | object | Additional data |

#### NetworkClient

Main client for security visualization.

| Property | Type | Description |
|----------|------|-------------|
| `firewallEnabled` | boolean | Whether firewall is active |
| `defaultAction` | string | Default action (allow/deny) |
| `rules` | FirewallRule[] | Firewall rules |
| `blockedIPs` | Set | Blocked IP addresses |
| `allowedIPs` | Set | Allowed IP addresses |
| `events` | NetworkEvent[] | Event history |
| `maxEvents` | number | Maximum events to store |
| `captures` | Map | Capture sessions |
| `nodes` | Map | Network topology nodes |
| `proxyConfig` | ProxyConfig | Proxy configuration |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `checkConnection(src, dst, port, proto, dir)` | string, string, number, string, string | object | Checks if connection allowed |
| `addRule(ruleData)` | object | object | Adds firewall rule |
| `removeRule(ruleId)` | string | object | Removes firewall rule |
| `updateRule(ruleId, updates)` | string, object | object | Updates firewall rule |
| `listRules()` | - | object | Lists all rules |
| `blockIP(ip)` | string | object | Blocks IP address |
| `allowIP(ip)` | string | object | Allows IP address |
| `getFirewallStatus()` | - | object | Gets firewall status |
| `setFirewallEnabled(enabled)` | boolean | object | Enables/disables firewall |
| `logEvent(type, data)` | string, object | NetworkEvent | Logs network event |
| `getEvents(limit, filter)` | number, object | object | Gets filtered events |
| `getStats()` | - | object | Gets monitor statistics |
| `startCapture(filter)` | object | object | Starts packet capture |
| `stopCapture(sessionId)` | string | object | Stops packet capture |
| `getPackets(sessionId, limit, offset)` | string, number, number | object | Gets captured packets |
| `listCaptures()` | - | object | Lists capture sessions |
| `updateTopology(ip)` | string | void | Updates topology with IP |
| `getTopology()` | - | object | Gets network topology |
| `renderTopology()` | - | object | Renders topology for visualization |
| `configureProxy(config)` | object | object | Configures proxy |
| `getProxyConfig()` | - | object | Gets proxy configuration |
| `getProxyHistory(limit)` | number | object | Gets proxy history |
| `export()` | - | object | Exports network data |
| `import(data)` | object | object | Imports network data |
| `reset()` | - | object | Resets all data |

### Constants

```javascript
const DIRECTION = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
  BOTH: 'both',
};

const FIREWALL_ACTION = {
  ALLOW: 'allow',
  DENY: 'deny',
  LOG: 'log',
  REJECT: 'reject',
};

const PROTOCOL = {
  TCP: 'tcp',
  UDP: 'udp',
  ICMP: 'icmp',
  ANY: 'any',
};

const EVENT_TYPE = {
  CONNECTION_ATTEMPT: 'connection_attempt',
  CONNECTION_ESTABLISHED: 'connection_established',
  CONNECTION_CLOSED: 'connection_closed',
  PACKET_SENT: 'packet_sent',
  PACKET_RECEIVED: 'packet_received',
  RULE_TRIGGERED: 'rule_triggered',
  BLOCKED: 'blocked',
  ALLOWED: 'allowed',
  ERROR: 'error',
};
```

### Preload API - window.gently.network

| Method | Parameters | Description |
|--------|------------|-------------|
| `firewallCheck(src, dst, port, proto, dir)` | string, string, number, string, string | Checks connection |
| `addRule(rule)` | object | Adds firewall rule |
| `removeRule(ruleId)` | string | Removes rule |
| `updateRule(ruleId, updates)` | string, object | Updates rule |
| `listRules()` | - | Lists rules |
| `blockIP(ip)` | string | Blocks IP |
| `allowIP(ip)` | string | Allows IP |
| `firewallStatus()` | - | Gets status |
| `setFirewallEnabled(enabled)` | boolean | Enables/disables |
| `getEvents(limit, filter)` | number, object | Gets events |
| `getStats()` | - | Gets statistics |
| `startCapture(filter)` | object | Starts capture |
| `stopCapture(sessionId)` | string | Stops capture |
| `getPackets(sessionId, limit, offset)` | string, number, number | Gets packets |
| `listCaptures()` | - | Lists captures |
| `getTopology()` | - | Gets topology |
| `renderTopology()` | - | Renders topology |
| `configureProxy(config)` | object | Configures proxy |
| `getProxyConfig()` | - | Gets proxy config |
| `getProxyHistory(limit)` | number | Gets proxy history |
| `export()` | - | Exports data |
| `import(data)` | object | Imports data |
| `reset()` | - | Resets all |
| `constants()` | - | Gets constants |

### Usage Examples

```javascript
// Add a firewall rule to block outbound traffic to specific port
await window.gently.network.addRule({
  name: 'Block SSH outbound',
  action: 'deny',
  direction: 'outbound',
  protocol: 'tcp',
  destPort: 22,
  priority: 50,
});

// Check if a connection would be allowed
const check = await window.gently.network.firewallCheck(
  '192.168.1.100',  // source
  '8.8.8.8',        // dest
  443,              // port
  'tcp',            // protocol
  'outbound'        // direction
);
console.log('Allowed:', check.allowed, 'Reason:', check.reason);

// Block a specific IP
await window.gently.network.blockIP('192.168.1.50');

// Start packet capture with filter
const capture = await window.gently.network.startCapture({
  protocol: 'tcp',
  port: 443,
});

// Later, get captured packets
const packets = await window.gently.network.getPackets(capture.session.id, 100, 0);

// Stop capture
await window.gently.network.stopCapture(capture.session.id);

// Get network topology for visualization
const topology = await window.gently.network.renderTopology();
console.log('Nodes:', topology.topology.nodes);
console.log('Edges:', topology.topology.edges);

// Get monitor statistics
const stats = await window.gently.network.getStats();
console.log('Events last minute:', stats.stats.eventsLastMinute);
console.log('Block rate:', stats.stats.blockRate + '%');
```

---

## 5. Sploit Client - Security Testing

### Overview

The Sploit Client implements a security testing framework similar to Metasploit, providing:

- **Module Database**: Searchable exploit and auxiliary modules
- **Target Management**: Track and scan targets
- **Exploitation**: Check vulnerabilities and run exploits
- **Session Management**: Manage active sessions
- **Workspace**: Organize testing data and credentials

**IMPORTANT**: This module is restricted to Dev tier with high hardware score requirements for security reasons.

### Tier Requirements

| Feature | Tier | Min HW Score | Bridge Required |
|---------|------|--------------|-----------------|
| `sploit.scan` | Dev | 50 | No |
| `sploit.check` | Dev | 75 | No |
| `sploit.exploit` | Dev | 100 | No |
| `sploit.sessions` | Dev | 100 | No |
| `sploit.workspace` | Dev | - | No |

### Classes

#### Target

Information about a target system.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `host` | string | Hostname or IP |
| `port` | number | Primary port |
| `protocol` | string | Protocol (default 'tcp') |
| `os` | string | Operating system |
| `arch` | string | Architecture |
| `services` | object[] | Discovered services |
| `vulnerabilities` | string[] | Known vulnerabilities (CVEs) |
| `notes` | string[] | User notes |
| `createdAt` | number | Creation timestamp |
| `lastScanned` | number | Last scan timestamp |

#### ModuleInfo

Information about a security module.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Module name |
| `type` | string | Module type (see MODULE_TYPE) |
| `fullname` | string | Full module path |
| `rank` | string | Reliability rank (see RANK) |
| `description` | string | Module description |
| `author` | string[] | Module authors |
| `references` | string[] | CVE, URL references |
| `platform` | string[] | Target platforms |
| `arch` | string[] | Target architectures |
| `targets` | object[] | Target configurations |
| `options` | object | Required/optional options |
| `privileged` | boolean | Requires privileged access |
| `disclosureDate` | string | Vulnerability disclosure date |

#### ExploitResult

Result of an exploit attempt.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `moduleId` | string | Module used |
| `targetId` | string | Target ID |
| `success` | boolean | Whether exploit succeeded |
| `sessionId` | string | Created session ID |
| `message` | string | Result message |
| `output` | string | Exploit output |
| `timestamp` | number | Execution timestamp |
| `duration` | number | Execution duration |

#### Session

An active exploitation session.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `type` | string | Session type (see SESSION_TYPE) |
| `targetId` | string | Target ID |
| `moduleId` | string | Module that created session |
| `host` | string | Target host |
| `port` | number | Target port |
| `username` | string | Authenticated username |
| `active` | boolean | Whether session is active |
| `createdAt` | number | Creation timestamp |
| `lastActivity` | number | Last activity timestamp |
| `info` | object | Session info |
| `history` | object[] | Command history |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `recordCommand(command, output)` | string, string | void | Records command execution |
| `toJSON()` | - | object | Serializes to JSON |
| `static fromJSON(json)` | object | Session | Deserializes from JSON |

#### Workspace

Workspace for organizing testing data.

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Workspace name |
| `hosts` | string[] | Target IDs |
| `credentials` | object[] | Discovered credentials |
| `loot` | object[] | Collected data/files |
| `notes` | string[] | Workspace notes |
| `createdAt` | number | Creation timestamp |
| `modifiedAt` | number | Last modification timestamp |

#### SploitClient

Main client for security testing.

| Property | Type | Description |
|----------|------|-------------|
| `workspace` | Workspace | Current workspace |
| `targets` | Map | ID to Target mapping |
| `modules` | Map | Fullname to ModuleInfo mapping |
| `sessions` | Map | ID to Session mapping |
| `globalOptions` | object | Global options |
| `results` | ExploitResult[] | Results history |

**Global Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `LHOST` | string | '0.0.0.0' | Local host for listeners |
| `LPORT` | number | 4444 | Local port for listeners |
| `THREADS` | number | 4 | Thread count |
| `TIMEOUT` | number | 10 | Operation timeout |
| `SSL` | boolean | false | Use SSL |
| `VERBOSE` | boolean | false | Verbose output |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `searchModules(query, type)` | string, string | object | Searches modules |
| `getModuleInfo(fullname)` | string | object | Gets module info |
| `listModules(type)` | string | object | Lists modules by type |
| `addTarget(host, port)` | string, number | object | Adds target |
| `getTarget(targetId)` | string | object | Gets target |
| `listTargets()` | - | object | Lists targets |
| `removeTarget(targetId)` | string | object | Removes target |
| `updateTarget(targetId, updates)` | string, object | object | Updates target |
| `scanTarget(targetId)` | string | object | Scans target |
| `checkVulnerable(module, targetId)` | string, string | object | Checks vulnerability |
| `runExploit(module, targetId, opts)` | string, string, object | object | Runs exploit |
| `runAuxiliary(module, targetId, opts)` | string, string, object | object | Runs auxiliary |
| `listSessions(activeOnly)` | boolean | object | Lists sessions |
| `getSession(sessionId)` | string | object | Gets session |
| `interactSession(sessionId, cmd)` | string, string | object | Executes command |
| `closeSession(sessionId)` | string | object | Closes session |
| `getSessionHistory(sessionId, limit)` | string, number | object | Gets session history |
| `getWorkspace()` | - | object | Gets workspace info |
| `saveWorkspace()` | - | object | Saves workspace |
| `loadWorkspace(data)` | object | object | Loads workspace |
| `addCredential(user, pass, svc, tgt)` | string, string, string, string | object | Adds credential |
| `listCredentials()` | - | object | Lists credentials |
| `getGlobalOptions()` | - | object | Gets global options |
| `setGlobalOption(name, value)` | string, any | object | Sets global option |
| `getStats()` | - | object | Gets framework stats |
| `reset()` | - | object | Resets framework |

### Constants

```javascript
const MODULE_TYPE = {
  EXPLOIT: 'exploit',
  AUXILIARY: 'auxiliary',
  POST: 'post',
  PAYLOAD: 'payload',
  ENCODER: 'encoder',
  NOP: 'nop',
};

const RANK = {
  EXCELLENT: 'excellent',
  GREAT: 'great',
  GOOD: 'good',
  NORMAL: 'normal',
  AVERAGE: 'average',
  LOW: 'low',
  MANUAL: 'manual',
};

const SESSION_TYPE = {
  SHELL: 'shell',
  METERPRETER: 'meterpreter',
  VNC: 'vnc',
  COMMAND: 'command',
};

const CHECK_RESULT = {
  VULNERABLE: 'vulnerable',
  NOT_VULNERABLE: 'not_vulnerable',
  UNKNOWN: 'unknown',
  SAFE: 'safe',
  DETECTED: 'detected',
};
```

### Preload API - window.gently.sploit

| Method | Parameters | Description |
|--------|------------|-------------|
| `searchModules(query, type)` | string, string | Searches modules |
| `getModule(fullname)` | string | Gets module info |
| `listModules(type)` | string | Lists modules |
| `addTarget(host, port)` | string, number | Adds target |
| `getTarget(targetId)` | string | Gets target |
| `listTargets()` | - | Lists targets |
| `removeTarget(targetId)` | string | Removes target |
| `updateTarget(targetId, updates)` | string, object | Updates target |
| `scanTarget(targetId)` | string | Scans target |
| `check(module, targetId)` | string, string | Checks vulnerability |
| `exploit(module, targetId, opts)` | string, string, object | Runs exploit |
| `runAuxiliary(module, targetId, opts)` | string, string, object | Runs auxiliary |
| `listSessions(activeOnly)` | boolean | Lists sessions |
| `getSession(sessionId)` | string | Gets session |
| `interact(sessionId, command)` | string, string | Executes command |
| `closeSession(sessionId)` | string | Closes session |
| `sessionHistory(sessionId, limit)` | string, number | Gets history |
| `getWorkspace()` | - | Gets workspace |
| `saveWorkspace()` | - | Saves workspace |
| `loadWorkspace(data)` | object | Loads workspace |
| `addCredential(user, pass, svc, tgt)` | string, string, string, string | Adds credential |
| `listCredentials()` | - | Lists credentials |
| `getOptions()` | - | Gets global options |
| `setOption(name, value)` | string, any | Sets option |
| `stats()` | - | Gets statistics |
| `reset()` | - | Resets framework |
| `constants()` | - | Gets constants |

### Usage Examples

```javascript
// Search for modules
const modules = await window.gently.sploit.searchModules('shellshock');
console.log('Found modules:', modules.modules.length);

// Add a target
const target = await window.gently.sploit.addTarget('192.168.1.100', 80);
const targetId = target.target.id;

// Scan the target
await window.gently.sploit.scanTarget(targetId);

// Check if target is vulnerable
const check = await window.gently.sploit.check(
  'exploit/multi/http/apache_mod_cgi_bash_env_exec',
  targetId
);
console.log('Vulnerable:', check.checkResult);

// If vulnerable, run exploit
if (check.checkResult === 'vulnerable') {
  const result = await window.gently.sploit.exploit(
    'exploit/multi/http/apache_mod_cgi_bash_env_exec',
    targetId,
    { TARGETURI: '/cgi-bin/test.cgi' }
  );

  if (result.result.success) {
    // Interact with session
    const output = await window.gently.sploit.interact(
      result.result.sessionId,
      'id'
    );
    console.log('Output:', output.output);
  }
}

// Save credentials found during testing
await window.gently.sploit.addCredential(
  'admin',
  'password123',
  'ssh',
  targetId
);

// Get framework statistics
const stats = await window.gently.sploit.stats();
console.log('Active sessions:', stats.stats.activeSessionCount);
```

---

## 6. Commerce Client - Vibe Commerce

### Overview

The Commerce Client implements a "Vibe Commerce" system that provides:

- **Natural Language Shopping**: Parse shopping queries from natural language
- **Product Search**: Search across multiple stores
- **Shopping Cart**: Unified cart management
- **Price Alerts**: Monitor prices for drops
- **Market Data**: TradingView-style market data integration

### Tier Requirements

| Feature | Tier | Min HW Score | Bridge Required |
|---------|------|--------------|-----------------|
| `commerce.search` | Pro | - | No |
| `commerce.cart` | Pro | - | No |
| `commerce.alerts` | Pro | - | No |
| `commerce.checkout` | Pro | - | Yes |
| `commerce.trading` | Dev | 50 | No |
| `commerce.stores` | Dev | - | No |

### Classes

#### VibeQuery

Parsed natural language shopping query.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `rawInput` | string | Original input text |
| `intent` | string | Detected intent (see QUERY_INTENT) |
| `keywords` | string[] | Extracted keywords |
| `filters` | object | Additional filters |
| `priceRange` | object | { min, max } price constraints |
| `category` | string | Detected category |
| `brand` | string | Detected brand |
| `sortBy` | string | Sorting preference |
| `timestamp` | number | Query timestamp |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `parse()` | - | VibeQuery | Parses the raw input |
| `toJSON()` | - | object | Serializes to JSON |

#### Product

Product information.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Product name |
| `price` | number | Current price |
| `originalPrice` | number | Original price (for discounts) |
| `currency` | string | Currency code (default 'USD') |
| `store` | string | Store name |
| `category` | string | Product category |
| `brand` | string | Brand name |
| `description` | string | Product description |
| `images` | string[] | Image URLs |
| `rating` | number | Rating (0-5) |
| `reviewCount` | number | Number of reviews |
| `inStock` | boolean | Availability |
| `variants` | object[] | Size, color options |
| `url` | string | Product URL |
| `metadata` | object | Additional data |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getDiscount()` | - | number | Discount percentage |
| `toJSON()` | - | object | Serializes to JSON |
| `static fromJSON(json)` | object | Product | Deserializes from JSON |

#### CartItem

Item in shopping cart.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `productId` | string | Product ID |
| `product` | Product | Product reference |
| `quantity` | number | Quantity |
| `variant` | object | Selected variant |
| `status` | string | Item status (see ITEM_STATUS) |
| `addedAt` | number | When added |
| `savedPrice` | number | Price when added |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getTotal()` | - | number | Item total |
| `toJSON()` | - | object | Serializes to JSON |

#### Cart

Shopping cart.

| Property | Type | Description |
|----------|------|-------------|
| `items` | CartItem[] | Cart items |
| `couponCode` | string | Applied coupon |
| `discount` | number | Discount percentage |
| `createdAt` | number | Creation timestamp |
| `modifiedAt` | number | Last modification timestamp |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `addItem(product, qty, variant)` | Product, number, object | Cart | Adds item |
| `removeItem(itemId)` | string | Cart | Removes item |
| `updateQuantity(itemId, qty)` | string, number | Cart | Updates quantity |
| `applyCoupon(code, percent)` | string, number | Cart | Applies coupon |
| `clear()` | - | Cart | Clears cart |
| `getTotals()` | - | object | Calculates totals |
| `toJSON()` | - | object | Serializes to JSON |

#### Store

Store configuration.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Store name |
| `domain` | string | Store domain |
| `enabled` | boolean | Whether store is enabled |
| `apiKey` | string | API key (if required) |
| `priority` | number | Search priority (lower = higher) |
| `supportedCategories` | string[] | Supported categories |
| `shipping` | object | Shipping configuration |
| `metadata` | object | Additional data |

#### PriceAlert

Price monitoring alert.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `productId` | string | Monitored product |
| `targetPrice` | number | Alert threshold |
| `currentPrice` | number | Current price |
| `triggered` | boolean | Whether alert triggered |
| `createdAt` | number | Creation timestamp |
| `triggeredAt` | number | Trigger timestamp |

#### CommerceClient

Main client for vibe commerce.

| Property | Type | Description |
|----------|------|-------------|
| `stores` | Map | ID to Store mapping |
| `products` | Map | ID to Product mapping (cache) |
| `cart` | Cart | Shopping cart |
| `alerts` | PriceAlert[] | Price alerts |
| `preferences` | object | User preferences |
| `searchHistory` | object[] | Search history |
| `marketData` | Map | Ticker to market data |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `parseVibeQuery(rawInput)` | string | object | Parses natural language query |
| `searchProducts(query, limit)` | string/VibeQuery, number | object | Searches products |
| `getProduct(productId)` | string | object | Gets product |
| `addToCart(productId, qty, variant)` | string, number, object | object | Adds to cart |
| `removeFromCart(itemId)` | string | object | Removes from cart |
| `updateQuantity(itemId, qty)` | string, number | object | Updates quantity |
| `getCartSummary()` | - | object | Gets cart summary |
| `applyCoupon(code)` | string | object | Applies coupon |
| `clearCart()` | - | object | Clears cart |
| `processCheckout(payment, shipping)` | object, object | object | Processes checkout |
| `setPriceAlert(productId, price)` | string, number | object | Sets price alert |
| `listAlerts()` | - | object | Lists alerts |
| `removeAlert(alertId)` | string | object | Removes alert |
| `getMarketData(ticker, timeframe)` | string, string | object | Gets market data |
| `setMarketAlert(ticker, price, dir)` | string, number, string | object | Sets market alert |
| `listStores()` | - | object | Lists stores |
| `addStore(name, domain)` | string, string | object | Adds store |
| `setStoreEnabled(storeId, enabled)` | string, boolean | object | Enables/disables store |
| `setPreferences(prefs)` | object | object | Sets preferences |
| `getPreferences()` | - | object | Gets preferences |
| `getRecommendations(limit)` | number | object | Gets recommendations |
| `getStats()` | - | object | Gets statistics |
| `export()` | - | object | Exports data |
| `import(data)` | object | object | Imports data |

### Constants

```javascript
const QUERY_INTENT = {
  SEARCH: 'search',
  COMPARE: 'compare',
  PRICE_CHECK: 'price_check',
  AVAILABILITY: 'availability',
  REVIEW: 'review',
  RECOMMEND: 'recommend',
};

const CATEGORY = {
  ELECTRONICS: 'electronics',
  CLOTHING: 'clothing',
  HOME: 'home',
  BOOKS: 'books',
  FOOD: 'food',
  HEALTH: 'health',
  TOYS: 'toys',
  SPORTS: 'sports',
  AUTO: 'auto',
  OTHER: 'other',
};

const ITEM_STATUS = {
  IN_CART: 'in_cart',
  SAVED: 'saved',
  PURCHASED: 'purchased',
  UNAVAILABLE: 'unavailable',
};
```

### Preload API - window.gently.commerce

| Method | Parameters | Description |
|--------|------------|-------------|
| `parseQuery(rawInput)` | string | Parses natural language query |
| `search(query, limit)` | string, number | Searches products |
| `getProduct(productId)` | string | Gets product |
| `addToCart(productId, qty, variant)` | string, number, object | Adds to cart |
| `removeFromCart(itemId)` | string | Removes from cart |
| `updateQuantity(itemId, qty)` | string, number | Updates quantity |
| `cartSummary()` | - | Gets cart summary |
| `applyCoupon(code)` | string | Applies coupon |
| `clearCart()` | - | Clears cart |
| `checkout(payment, shipping)` | object, object | Processes checkout |
| `setAlert(productId, price)` | string, number | Sets price alert |
| `listAlerts()` | - | Lists alerts |
| `removeAlert(alertId)` | string | Removes alert |
| `marketData(ticker, timeframe)` | string, string | Gets market data |
| `marketAlert(ticker, price, dir)` | string, number, string | Sets market alert |
| `listStores()` | - | Lists stores |
| `addStore(name, domain)` | string, string | Adds store |
| `setStoreEnabled(storeId, enabled)` | string, boolean | Enables/disables store |
| `setPreferences(prefs)` | object | Sets preferences |
| `getPreferences()` | - | Gets preferences |
| `recommendations(limit)` | number | Gets recommendations |
| `stats()` | - | Gets statistics |
| `export()` | - | Exports data |
| `import(data)` | object | Imports data |
| `constants()` | - | Gets constants |

### Usage Examples

```javascript
// Parse a natural language shopping query
const query = await window.gently.commerce.parseQuery(
  'find me a cheap laptop under $500 with good reviews'
);
console.log('Intent:', query.query.intent);
console.log('Price max:', query.query.priceRange.max);
console.log('Sort by:', query.query.sortBy);

// Search products
const results = await window.gently.commerce.search(query.query.rawInput, 20);

// Add product to cart
const firstProduct = results.products[0];
await window.gently.commerce.addToCart(firstProduct.id, 1);

// Get cart summary
const cart = await window.gently.commerce.cartSummary();
console.log('Cart total:', cart.cart.totals.total);

// Apply coupon
await window.gently.commerce.applyCoupon('SAVE10');

// Set price alert
await window.gently.commerce.setAlert(firstProduct.id, firstProduct.price * 0.8);

// Get market data (for trading integration)
const market = await window.gently.commerce.marketData('AAPL', '1D');
console.log('AAPL price:', market.data.currentPrice);

// Get recommendations based on search history
const recommendations = await window.gently.commerce.recommendations(5);
```

---

## 7. Dance Client - Device Pairing

### Overview

The Dance Client implements a secure device pairing protocol using:

- **XOR Secret Reconstruction**: Two devices each hold a fragment; combining them via XOR reconstructs the secret
- **Visual/Audio Call-and-Response**: Pattern generation for human verification
- **Smart Contracts**: Conditional access control with expiry and verification

The "dance" metaphor represents the coordinated exchange between two devices.

### Tier Requirements

| Feature | Tier | Min HW Score | Bridge Required |
|---------|------|--------------|-----------------|
| `dance.initiate` | Pro | - | Yes |
| `dance.exchange` | Pro | - | Yes |
| `dance.contract` | Dev | - | Yes |
| `dance.audit` | Dev | 50 | Yes |
| `dance.pattern` | Dev | - | No |

### Classes

#### Condition

Contract condition for access control.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `type` | string | Condition type (see CONDITION_TYPE) |
| `params` | object | Condition parameters |
| `verified` | boolean | Whether condition verified |
| `verifiedAt` | number | Verification timestamp |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `check(context)` | object | boolean | Checks if condition is met |
| `toJSON()` | - | object | Serializes to JSON |
| `static fromJSON(json)` | object | Condition | Deserializes from JSON |

#### Contract

Dance contract for conditional access control.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `creator` | string | Creator device ID |
| `description` | string | Contract description |
| `conditions` | Condition[] | Access conditions |
| `expiryBlock` | number | Block height expiry |
| `expiryTime` | number | Timestamp expiry |
| `signature` | string | Contract signature |
| `signedBy` | string | Signer ID |
| `createdAt` | number | Creation timestamp |
| `modifiedAt` | number | Last modification timestamp |
| `metadata` | object | Additional data |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `addCondition(condition)` | Condition | Contract | Adds condition |
| `setExpiry(block, time)` | number, number | Contract | Sets expiry |
| `isExpired()` | - | boolean | Checks if expired |
| `sign(secret)` | string | Contract | Signs contract |
| `verifySignature(secret)` | string | boolean | Verifies signature |
| `checkConditions(context)` | object | object | Checks all conditions |
| `toJSON()` | - | object | Serializes to JSON |
| `static fromJSON(json)` | object | Contract | Deserializes from JSON |

#### DanceSession

Orchestrates the pairing handshake.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `role` | string | 'lock' or 'key' (see DANCE_ROLE) |
| `state` | string | Current state (see DANCE_STATE) |
| `contract` | Contract | Associated contract |
| `localFragment` | string | This device's secret fragment |
| `remoteFragment` | string | Received fragment |
| `reconstructedSecret` | string | XOR-reconstructed secret |
| `challenge` | string | Challenge string |
| `response` | string | Challenge response |
| `auditResult` | string | Audit result (see AUDIT_RESULT) |
| `peerDeviceId` | string | Peer device ID |
| `createdAt` | number | Creation timestamp |
| `modifiedAt` | number | Last modification timestamp |
| `history` | object[] | State transition history |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `transition(newState, data)` | string, object | void | Records state transition |
| `wake()` | - | object | Transitions to ready |
| `init(peerDeviceId)` | string | object | Initializes handshake |
| `generateChallenge()` | - | object | Generates challenge |
| `respondToChallenge(challenge, fragment)` | string, string | object | Responds to challenge |
| `exchange(remoteFragment)` | string | object | Exchanges fragment, reconstructs secret |
| `verify()` | - | object | Verifies exchange |
| `audit(context)` | object | object | Audits contract |
| `abort(reason)` | string | object | Aborts session |
| `toJSON()` | - | object | Serializes to JSON |

#### DanceClient

Main client for device pairing.

| Property | Type | Description |
|----------|------|-------------|
| `session` | DanceSession | Active session |
| `deviceId` | string | This device's ID |
| `contracts` | Map | ID to Contract mapping |
| `completedSessions` | object[] | Archived sessions |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `initiateLockHolder(fragment, contract)` | string, Contract | object | Initializes as lock holder |
| `initiateKeyHolder(fragment, contract)` | string, Contract | object | Initializes as key holder |
| `wake()` | - | object | Wakes session |
| `getCurrentState()` | - | object | Gets current state |
| `init(peerDeviceId)` | string | object | Initializes handshake |
| `challenge()` | - | object | Generates challenge |
| `respondChallenge(challenge)` | string | object | Responds to challenge |
| `exchange(remoteFragment)` | string | object | Exchanges fragment |
| `verify()` | - | object | Verifies exchange |
| `audit(context)` | object | object | Audits contract |
| `abort(reason)` | string | object | Aborts session |
| `getReconstructedSecret()` | - | object | Gets reconstructed secret |
| `createContract(description)` | string | object | Creates contract |
| `getContract(contractId)` | string | object | Gets contract |
| `addCondition(contractId, type, params)` | string, string, object | object | Adds condition |
| `setExpiry(contractId, block, time)` | string, number, number | object | Sets expiry |
| `signContract(contractId, secret)` | string, string | object | Signs contract |
| `verifyContract(contractId, secret)` | string, string | object | Verifies signature |
| `listContracts()` | - | object | Lists contracts |
| `deleteContract(contractId)` | string | object | Deletes contract |
| `useContract(contractId)` | string | object | Uses contract in session |
| `generatePattern(fragment)` | string | object | Generates visual pattern |
| `verifyPattern(pattern, fragment)` | object, string | object | Verifies pattern match |
| `getStats()` | - | object | Gets statistics |
| `getCompletedSessions(limit)` | number | object | Gets completed sessions |
| `reset()` | - | object | Resets client |
| `export()` | - | object | Exports data |
| `import(data)` | object | object | Imports data |

### Constants

```javascript
const DANCE_STATE = {
  DORMANT: 'dormant',        // Not started
  READY: 'ready',            // Waiting to begin
  INIT: 'init',              // Initial handshake
  CHALLENGE: 'challenge',    // Challenge sent
  EXCHANGE: 'exchange',      // Key fragment exchange
  VERIFY: 'verify',          // Verification step
  AUDIT: 'audit',            // Contract audit
  COMPLETE: 'complete',      // Successfully completed
  FAILED: 'failed',          // Failed/aborted
};

const DANCE_ROLE = {
  LOCK: 'lock',              // Device holding the lock fragment
  KEY: 'key',                // Device holding the key fragment
};

const CONDITION_TYPE = {
  TOKEN_BALANCE: 'token_balance',    // Must hold X tokens
  TIME_WINDOW: 'time_window',        // Must be within time range
  DEVICE_PRESENT: 'device_present',  // Specific device must be present
  NFT_HOLDER: 'nft_holder',          // Must hold specific NFT
  LOCATION: 'location',              // Geographic restriction
  CUSTOM: 'custom',                  // Custom condition
};

const AUDIT_RESULT = {
  PASS: 'pass',
  INVALID_SIGNATURE: 'invalid_signature',
  EXPIRED: 'expired',
  CONDITION_FAILED: 'condition_failed',
  MISMATCH: 'mismatch',
};
```

### Preload API - window.gently.dance

| Method | Parameters | Description |
|--------|------------|-------------|
| `initLock(fragment, contractId)` | string, string | Initializes as lock holder |
| `initKey(fragment, contractId)` | string, string | Initializes as key holder |
| `wake()` | - | Wakes session |
| `state()` | - | Gets current state |
| `start(peerDeviceId)` | string | Starts handshake |
| `challenge()` | - | Generates challenge |
| `respond(challenge)` | string | Responds to challenge |
| `exchange(remoteFragment)` | string | Exchanges fragment |
| `verify()` | - | Verifies exchange |
| `audit(context)` | object | Audits contract |
| `abort(reason)` | string | Aborts session |
| `secret()` | - | Gets reconstructed secret |
| `createContract(description)` | string | Creates contract |
| `getContract(contractId)` | string | Gets contract |
| `addCondition(contractId, type, params)` | string, string, object | Adds condition |
| `setExpiry(contractId, block, time)` | string, number, number | Sets expiry |
| `signContract(contractId, secret)` | string, string | Signs contract |
| `verifyContract(contractId, secret)` | string, string | Verifies signature |
| `listContracts()` | - | Lists contracts |
| `deleteContract(contractId)` | string | Deletes contract |
| `useContract(contractId)` | string | Uses contract in session |
| `generatePattern(fragment)` | string | Generates visual pattern |
| `verifyPattern(pattern, fragment)` | object, string | Verifies pattern |
| `stats()` | - | Gets statistics |
| `completedSessions(limit)` | number | Gets completed sessions |
| `reset()` | - | Resets client |
| `export()` | - | Exports data |
| `import(data)` | object | Imports data |
| `constants()` | - | Gets constants |

### Usage Examples

```javascript
// Device A (Lock holder) - has the "lock" fragment
const lockFragment = 'a1b2c3d4e5f6...'; // First half of split secret
await window.gently.dance.initLock(lockFragment);
await window.gently.dance.wake();

// Device B (Key holder) - has the "key" fragment
const keyFragment = 'f6e5d4c3b2a1...'; // Second half of split secret
await window.gently.dance.initKey(keyFragment);
await window.gently.dance.wake();

// Device A starts handshake
await window.gently.dance.start('device_b_id');
const challengeResult = await window.gently.dance.challenge();

// Device B responds to challenge
const responseResult = await window.gently.dance.respond(challengeResult.challenge);

// Exchange fragments (Device A sends, Device B receives and vice versa)
// This would happen via a communication channel (QR code, NFC, etc.)
await window.gently.dance.exchange(remoteFragment);

// Verify the exchange
await window.gently.dance.verify();

// Audit any contract conditions
await window.gently.dance.audit({ balance: 100, region: 'US' });

// Get the reconstructed secret
const secretResult = await window.gently.dance.secret();
console.log('Reconstructed secret:', secretResult.secret);

// Generate visual pattern for verification
const pattern = await window.gently.dance.generatePattern(lockFragment);
// Display pattern.pattern.colors in UI for visual verification

// Create a contract with conditions
const contract = await window.gently.dance.createContract('Secure file access');
await window.gently.dance.addCondition(
  contract.contract.id,
  'token_balance',
  { minBalance: 100 }
);
await window.gently.dance.addCondition(
  contract.contract.id,
  'time_window',
  { start: Date.now(), end: Date.now() + 3600000 } // 1 hour window
);
await window.gently.dance.signContract(contract.contract.id, 'signing_secret');
```

---

## 8. Tier Gate - Feature Access Control

### Overview

The Tier Gate system implements code-locked feature rotation based on:

- **User Tier**: free, basic, pro, dev
- **Hardware Score**: Performance-based capability assessment
- **Bridge Status**: Whether the Bridge API is online

Features dynamically appear or hide based on these factors.

### Tier Levels

| Tier | Level | Description |
|------|-------|-------------|
| free | 0 | Basic features, no cost |
| basic | 1 | Essential paid features |
| pro | 2 | Advanced features |
| dev | 3 | Full development access |

### Hardware Score Thresholds

The hardware score can cap the effective tier:

| Score Range | Maximum Tier |
|-------------|--------------|
| 0-24 | free |
| 25-49 | basic |
| 50-99 | pro |
| 100+ | dev |

### Classes

#### TierGate

Feature access control system.

| Property | Type | Description |
|----------|------|-------------|
| `userTier` | string | User's subscription tier |
| `hardwareScore` | number | Hardware capability score |
| `bridgeOnline` | boolean | Bridge API status |

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getEffectiveTier()` | - | string | Gets effective tier (min of user and HW) |
| `isFeatureAvailable(feature)` | string | boolean | Checks if feature is available |
| `getFeatureBlockReason(feature)` | string | string | Gets reason feature is blocked |
| `getAvailableFeatures(scope)` | string | object[] | Gets available features for scope |
| `getAllScopeFeatures(scope)` | string | object[] | Gets all features for scope |
| `getTierInfo()` | - | object | Gets tier comparison info |

### Feature Requirements Reference

Each feature has requirements in the format:
```javascript
{
  scope: 'namespace',      // Feature namespace
  tier: 'tier',            // Minimum tier required
  minScore: number,        // Optional: minimum hardware score
  requiresBridge: boolean  // Optional: requires Bridge API
}
```

**Artisan Features:**

| Feature | Tier | Min Score | Bridge |
|---------|------|-----------|--------|
| `artisan.view` | free | - | No |
| `artisan.create` | basic | - | No |
| `artisan.refine` | basic | - | No |
| `artisan.blend` | pro | - | No |
| `artisan.query` | pro | - | No |
| `artisan.traverse` | pro | - | No |
| `artisan.foam` | dev | - | No |
| `artisan.export` | dev | - | No |
| `artisan.render` | dev | 25 | No |

**Architect Features:**

| Feature | Tier | Min Score | Bridge |
|---------|------|-----------|--------|
| `architect.ideas` | basic | - | No |
| `architect.embed` | basic | - | No |
| `architect.confirm` | basic | - | No |
| `architect.crystallize` | pro | - | No |
| `architect.tree` | pro | - | No |
| `architect.recall` | pro | 25 | No |
| `architect.flowchart` | dev | 50 | No |
| `architect.export` | dev | - | No |

**Behavior Features:**

| Feature | Tier | Min Score | Bridge |
|---------|------|-----------|--------|
| `behavior.profile` | basic | - | No |
| `behavior.predict` | pro | - | No |
| `behavior.chains` | pro | 25 | No |
| `behavior.adaptations` | dev | 50 | No |
| `behavior.export` | dev | - | No |

**Network Features:**

| Feature | Tier | Min Score | Bridge |
|---------|------|-----------|--------|
| `network.firewall` | pro | - | No |
| `network.monitor` | pro | 25 | No |
| `network.topology` | pro | - | No |
| `network.capture` | dev | 50 | No |
| `network.proxy` | dev | 75 | No |
| `network.export` | dev | - | No |

**Sploit Features:**

| Feature | Tier | Min Score | Bridge |
|---------|------|-----------|--------|
| `sploit.scan` | dev | 50 | No |
| `sploit.check` | dev | 75 | No |
| `sploit.exploit` | dev | 100 | No |
| `sploit.sessions` | dev | 100 | No |
| `sploit.workspace` | dev | - | No |

**Commerce Features:**

| Feature | Tier | Min Score | Bridge |
|---------|------|-----------|--------|
| `commerce.search` | pro | - | No |
| `commerce.cart` | pro | - | No |
| `commerce.alerts` | pro | - | No |
| `commerce.checkout` | pro | - | Yes |
| `commerce.trading` | dev | 50 | No |
| `commerce.stores` | dev | - | No |

**Dance Features:**

| Feature | Tier | Min Score | Bridge |
|---------|------|-----------|--------|
| `dance.initiate` | pro | - | Yes |
| `dance.exchange` | pro | - | Yes |
| `dance.contract` | dev | - | Yes |
| `dance.audit` | dev | 50 | Yes |
| `dance.pattern` | dev | - | No |

### Preload API - window.gently.tier

| Method | Parameters | Description |
|--------|------------|-------------|
| `getEffective()` | - | Gets effective tier info |
| `checkFeature(feature)` | string | Checks if feature is available |
| `getScopeFeatures(scope)` | string | Gets features for scope |
| `getAllFeatures()` | - | Gets all feature requirements |
| `onTierChange(callback)` | function | Listens for tier changes |
| `onFeaturesChanged(callback)` | function | Listens for feature changes |

### Usage Examples

```javascript
// Check if a feature is available
const result = await window.gently.tier.checkFeature('architect.flowchart');
if (result.available) {
  // Feature is available, show UI
} else {
  console.log('Feature blocked:', result.reason);
}

// Get all available features for a scope
const features = await window.gently.tier.getScopeFeatures('artisan');
features.forEach(f => {
  console.log('Available:', f.feature, 'Tier:', f.tier);
});

// Get current tier info
const tierInfo = await window.gently.tier.getEffective();
console.log('User tier:', tierInfo.userTier);
console.log('Hardware score:', tierInfo.hardwareScore);
console.log('Effective tier:', tierInfo.effectiveTier);

// Listen for tier changes
window.gently.tier.onTierChange((data) => {
  console.log('Tier changed to:', data.effectiveTier);
});

// Listen for feature availability changes
window.gently.tier.onFeaturesChanged((data) => {
  console.log('Features updated, re-render UI');
});
```

---

## 9. Preload API Reference

The preload script exposes the `window.gently` API to the renderer process. This section provides a complete reference of all Phase 8 namespaces.

### API Structure

```
window.gently
  +-- artisan     (Toroidal Knowledge Storage)
  +-- architect   (Idea Crystallization)
  +-- behavior    (Adaptive UI Learning)
  +-- network     (Security Visualization)
  +-- sploit      (Security Testing)
  +-- commerce    (Vibe Commerce)
  +-- dance       (Device Pairing)
  +-- tier        (Feature Access Control)
```

### Complete Method Index

#### window.gently.artisan

```javascript
// Torus operations
createTorus(label, majorRadius, tokensSpent)  // Creates new torus
getTorus(torusId)                              // Gets torus by ID
listTori()                                     // Lists all tori
addTokens(torusId, tokens)                     // Adds tokens to torus
refine(torusId)                                // Refines winding level
validate(torusId, bsScore)                     // Updates BS score
addPoint(torusId, major, minor, hash)          // Adds point to torus

// Blend operations
blend(torusIdA, torusIdB, strength)            // Creates blend
getNeighbors(torusId)                          // Gets neighbor tori
decayBlends(factor)                            // Decays all blends
boostBlend(blendId, amount)                    // Boosts blend

// Traversal and search
traverse(startId, endId, maxDepth)             // Finds path
query(queryVector, xorKey)                     // BARF search

// Foam operations
createFoam(name)                               // Creates new foam
setFoam(name)                                  // Sets active foam
stats()                                        // Gets statistics
render()                                       // Renders for visualization
export()                                       // Exports foam
import(data)                                   // Imports foam
windingLevels()                                // Gets winding level constants
```

#### window.gently.architect

```javascript
// Idea operations
createIdea(content, tags)                      // Creates new idea
getIdea(ideaId)                                // Gets idea by ID
listIdeas(state)                               // Lists ideas
embedIdea(ideaId, embedding, chain)            // Embeds idea
confirmIdea(ideaId)                            // Confirms idea
crystallizeIdea(ideaId, sourceFile)            // Crystallizes idea
branchIdea(ideaId, newContent)                 // Branches idea
connectIdeas(ideaA, ideaB)                     // Connects ideas
scoreIdea(ideaId, c, f, i, comp)               // Scores idea
tagIdea(ideaId, tags)                          // Tags idea

// Tree operations
createTree(name, rootPath)                     // Creates tree
setTree(treeId)                                // Sets active tree
getTree()                                      // Gets active tree
listTrees()                                    // Lists trees
addDirectory(name, parentId)                   // Adds directory
addFile(name, parentId, language)              // Adds file
linkIdea(nodeId, ideaId)                       // Links idea to node
renderTree(treeId)                             // Renders tree

// Recall operations
recall(query, limit)                           // Recalls ideas
suggest(limit)                                 // Suggests connections
rank(limit)                                    // Ranks ideas

// Flowchart
flowchart(rootIdeaId)                          // Generates flowchart

// Export/Import
export()                                       // Exports data
import(data)                                   // Imports data
stats()                                        // Gets statistics
ideaStates()                                   // Gets state constants
```

#### window.gently.behavior

```javascript
observe(action)                                // Observes action
predict()                                      // Gets predictions
chains()                                       // Gets detected chains
adaptations(level)                             // Gets UI adaptations
stats()                                        // Gets statistics
reset()                                        // Resets learning
configure(config)                              // Updates configuration
setEnabled(enabled)                            // Enables/disables
export()                                       // Exports data
import(data)                                   // Imports data
history(limit)                                 // Gets recent history
actionTypes()                                  // Gets action type constants
```

#### window.gently.network

```javascript
// Firewall
firewallCheck(src, dst, port, proto, dir)      // Checks connection
addRule(rule)                                  // Adds rule
removeRule(ruleId)                             // Removes rule
updateRule(ruleId, updates)                    // Updates rule
listRules()                                    // Lists rules
blockIP(ip)                                    // Blocks IP
allowIP(ip)                                    // Allows IP
firewallStatus()                               // Gets status
setFirewallEnabled(enabled)                    // Enables/disables

// Monitor
getEvents(limit, filter)                       // Gets events
getStats()                                     // Gets statistics

// Capture
startCapture(filter)                           // Starts capture
stopCapture(sessionId)                         // Stops capture
getPackets(sessionId, limit, offset)           // Gets packets
listCaptures()                                 // Lists captures

// Topology
getTopology()                                  // Gets topology
renderTopology()                               // Renders topology

// Proxy
configureProxy(config)                         // Configures proxy
getProxyConfig()                               // Gets proxy config
getProxyHistory(limit)                         // Gets proxy history

// Export/Import
export()                                       // Exports data
import(data)                                   // Imports data
reset()                                        // Resets all
constants()                                    // Gets constants
```

#### window.gently.sploit

```javascript
// Modules
searchModules(query, type)                     // Searches modules
getModule(fullname)                            // Gets module info
listModules(type)                              // Lists modules

// Targets
addTarget(host, port)                          // Adds target
getTarget(targetId)                            // Gets target
listTargets()                                  // Lists targets
removeTarget(targetId)                         // Removes target
updateTarget(targetId, updates)                // Updates target
scanTarget(targetId)                           // Scans target

// Exploitation
check(module, targetId)                        // Checks vulnerability
exploit(module, targetId, opts)                // Runs exploit
runAuxiliary(module, targetId, opts)           // Runs auxiliary

// Sessions
listSessions(activeOnly)                       // Lists sessions
getSession(sessionId)                          // Gets session
interact(sessionId, command)                   // Executes command
closeSession(sessionId)                        // Closes session
sessionHistory(sessionId, limit)               // Gets history

// Workspace
getWorkspace()                                 // Gets workspace
saveWorkspace()                                // Saves workspace
loadWorkspace(data)                            // Loads workspace
addCredential(user, pass, svc, tgt)            // Adds credential
listCredentials()                              // Lists credentials

// Options
getOptions()                                   // Gets global options
setOption(name, value)                         // Sets option

// Stats
stats()                                        // Gets statistics
reset()                                        // Resets framework
constants()                                    // Gets constants
```

#### window.gently.commerce

```javascript
// Query
parseQuery(rawInput)                           // Parses query
search(query, limit)                           // Searches products
getProduct(productId)                          // Gets product

// Cart
addToCart(productId, qty, variant)             // Adds to cart
removeFromCart(itemId)                         // Removes from cart
updateQuantity(itemId, qty)                    // Updates quantity
cartSummary()                                  // Gets cart summary
applyCoupon(code)                              // Applies coupon
clearCart()                                    // Clears cart

// Checkout
checkout(payment, shipping)                    // Processes checkout

// Alerts
setAlert(productId, price)                     // Sets price alert
listAlerts()                                   // Lists alerts
removeAlert(alertId)                           // Removes alert

// Market
marketData(ticker, timeframe)                  // Gets market data
marketAlert(ticker, price, dir)                // Sets market alert

// Stores
listStores()                                   // Lists stores
addStore(name, domain)                         // Adds store
setStoreEnabled(storeId, enabled)              // Enables/disables

// Preferences
setPreferences(prefs)                          // Sets preferences
getPreferences()                               // Gets preferences
recommendations(limit)                         // Gets recommendations

// Stats
stats()                                        // Gets statistics
export()                                       // Exports data
import(data)                                   // Imports data
constants()                                    // Gets constants
```

#### window.gently.dance

```javascript
// Session
initLock(fragment, contractId)                 // Initializes as lock
initKey(fragment, contractId)                  // Initializes as key
wake()                                         // Wakes session
state()                                        // Gets current state
start(peerDeviceId)                            // Starts handshake
challenge()                                    // Generates challenge
respond(challenge)                             // Responds to challenge
exchange(remoteFragment)                       // Exchanges fragment
verify()                                       // Verifies exchange
audit(context)                                 // Audits contract
abort(reason)                                  // Aborts session
secret()                                       // Gets reconstructed secret

// Contracts
createContract(description)                    // Creates contract
getContract(contractId)                        // Gets contract
addCondition(contractId, type, params)         // Adds condition
setExpiry(contractId, block, time)             // Sets expiry
signContract(contractId, secret)               // Signs contract
verifyContract(contractId, secret)             // Verifies signature
listContracts()                                // Lists contracts
deleteContract(contractId)                     // Deletes contract
useContract(contractId)                        // Uses contract

// Patterns
generatePattern(fragment)                      // Generates visual pattern
verifyPattern(pattern, fragment)               // Verifies pattern

// Stats
stats()                                        // Gets statistics
completedSessions(limit)                       // Gets completed sessions
reset()                                        // Resets client
export()                                       // Exports data
import(data)                                   // Imports data
constants()                                    // Gets constants
```

#### window.gently.tier

```javascript
getEffective()                                 // Gets effective tier info
checkFeature(feature)                          // Checks if feature available
getScopeFeatures(scope)                        // Gets features for scope
getAllFeatures()                               // Gets all features
onTierChange(callback)                         // Listens for tier changes
onFeaturesChanged(callback)                    // Listens for feature changes
```

---

## Appendix A: Error Handling

All API methods return objects with a `success` boolean field:

```javascript
// Successful response
{
  success: true,
  // ... result data
}

// Error response
{
  success: false,
  error: 'Error message'
}
```

Always check the `success` field before accessing result data:

```javascript
const result = await window.gently.artisan.createTorus('test');
if (result.success) {
  console.log('Created:', result.torus.id);
} else {
  console.error('Error:', result.error);
}
```

---

## Appendix B: Data Persistence

These client modules maintain state in memory. For persistence across sessions:

1. Use the `export()` method to serialize state
2. Store the exported data (localStorage, file, etc.)
3. Use the `import()` method on next session to restore state

Example:
```javascript
// Save state
const exported = await window.gently.artisan.export();
localStorage.setItem('artisan', JSON.stringify(exported.data));

// Restore state
const saved = JSON.parse(localStorage.getItem('artisan'));
if (saved) {
  await window.gently.artisan.import(saved);
}
```

---

## Appendix C: Version Information

- **Document Version**: 1.0.0
- **Phase**: 8
- **Compatible With**: GentlyOS Electron App v0.8.x
- **Last Updated**: 2024

---

*This documentation is part of the GentlyOS project. All features are subject to tier-based access control.*
