# CONVERSATION BRANCHING — TIMELINE SPLITS
## Git for Claude Sessions

---

## WHAT YOU'RE ACTUALLY ASKING

```
LINEAR CONVERSATION (how Claude works now):

  MSG1 → MSG2 → MSG3 → MSG4 → MSG5 → MSG6 → CONCLUSION
  
  You can't go back. MSG6 knows about MSG1-5.
  The conclusion is contaminated by the entire path.


WHAT YOU WANT (branching timelines):

  MSG1 → MSG2 → MSG3 → MSG4 → MSG5 → MSG6 → CONCLUSION A
                   │
                   └──→ MSG4b → MSG5b → MSG6b → CONCLUSION B
                          │
                          └──→ MSG5c → CONCLUSION C

  Branch B starts from MSG3's state.
  Branch B does NOT know about MSG4-6.
  Branch C starts from MSG4b's state.
  
  BUT you can optionally PULL insights from Branch A 
  into Branch B via vector retrieval — cherry-pick 
  knowledge without importing the whole timeline.
```

---

## WHY THIS IS HARD (AND WHY IT'S ACTUALLY SIMPLE)

**Why it seems hard:**
Claude.ai doesn't support branching. Each chat is linear.
You can't "rewind" a conversation.

**Why it's actually simple:**
A Claude conversation is just an array of messages:

```json
[
  { "role": "user", "content": "MSG1" },
  { "role": "assistant", "content": "REPLY1" },
  { "role": "user", "content": "MSG2" },
  { "role": "assistant", "content": "REPLY2" },
  { "role": "user", "content": "MSG3" },
  { "role": "assistant", "content": "REPLY3" }
]
```

To "branch from MSG3" you just... truncate the array:

```json
[
  { "role": "user", "content": "MSG1" },
  { "role": "assistant", "content": "REPLY1" },
  { "role": "user", "content": "MSG2" },
  { "role": "assistant", "content": "REPLY2" },
  { "role": "user", "content": "MSG3" },
  { "role": "assistant", "content": "REPLY3" },
  { "role": "user", "content": "NEW DIRECTION..." }  ← Branch starts here
]

Claude sees MSG1-3 + replies. It has NO KNOWLEDGE of MSG4-6.
The future doesn't exist. Clean timeline split.
```

**The conversation IS the state. Truncate = rewind. Append = branch.**

---

## THE THREE WAYS TO DO THIS

### Method 1: API Direct (Full Control, Most Power)
### Method 2: Claude.ai Tab Cloning (Extension-Based, No API)
### Method 3: Hybrid (Extension + API, Best of Both)

---

## METHOD 1: API DIRECT

Use the Anthropic API to manage conversations as data.
You control the messages array directly.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  CONVERSATION TREE (stored locally)                 │
│                                                     │
│  ROOT                                               │
│  ├── msg[0]: user: "Let's design the OLO system"   │
│  ├── msg[1]: assistant: "Here's my approach..."     │
│  ├── msg[2]: user: "Focus on the blue channel"      │
│  ├── msg[3]: assistant: "The blue channel..."       │
│  │                                                  │
│  ├── CHECKPOINT: "blue-channel-base" ◄── SAVE HERE  │
│  │                                                  │
│  ├── BRANCH A (continue from checkpoint)            │
│  │   ├── msg[4a]: user: "Go deeper on JPEG loss"   │
│  │   ├── msg[5a]: assistant: "JPEG 4:2:0..."       │
│  │   └── msg[6a]: assistant: "Conclusion: ..."     │
│  │                                                  │
│  └── BRANCH B (also from checkpoint)                │
│      ├── msg[4b]: user: "What about PNG instead?"   │
│      ├── msg[5b]: assistant: "PNG preserves..."     │
│      └── msg[6b]: assistant: "Conclusion: ..."     │
│                                                     │
│  Branch A's API call: [msg0, msg1, msg2, msg3, 4a]  │
│  Branch B's API call: [msg0, msg1, msg2, msg3, 4b]  │
│                                                     │
│  Same history up to checkpoint.                     │
│  Different futures. No contamination.               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### How branching works:

```javascript
class ConversationTree {
  constructor() {
    this.nodes = new Map();  // id -> { message, parent_id, children: [] }
    this.root = null;
    this.activeBranch = null; // Current branch tip we're talking on
    this.checkpoints = new Map(); // name -> node_id
  }

  // Add a message to current branch
  addMessage(role, content) {
    const node = {
      id: crypto.randomUUID(),
      message: { role, content },
      parent_id: this.activeBranch,
      children: [],
      timestamp: Date.now(),
      embedding: null  // For vector retrieval later
    };
    
    this.nodes.set(node.id, node);
    
    if (this.activeBranch) {
      this.nodes.get(this.activeBranch).children.push(node.id);
    } else {
      this.root = node.id;
    }
    
    this.activeBranch = node.id;
    return node.id;
  }

  // Save a checkpoint at current position
  checkpoint(name) {
    this.checkpoints.set(name, this.activeBranch);
  }

  // Branch from a checkpoint (or any node)
  branch(fromNodeId) {
    // Just move the active pointer back
    // The next addMessage() will create a new child
    // = a new branch from that point
    this.activeBranch = fromNodeId;
  }

  // Get the messages array for the current branch
  // This is what we send to the API
  getMessages() {
    const messages = [];
    let current = this.activeBranch;
    
    // Walk up the tree to root
    while (current) {
      const node = this.nodes.get(current);
      messages.unshift(node.message);
      current = node.parent_id;
    }
    
    return messages;
  }

  // Get ALL messages across ALL branches (for vector search)
  getAllMessages() {
    return Array.from(this.nodes.values()).map(n => n.message);
  }
}
```

### Making an API call on a branch:

```javascript
async function chat(tree, userMessage) {
  // Add user message to current branch
  tree.addMessage('user', userMessage);
  
  // Get the messages array (root → current position only)
  const messages = tree.getMessages();
  
  // Call Anthropic API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: messages  // ← Only this branch's history
    })
  });
  
  const data = await response.json();
  const assistantMessage = data.content[0].text;
  
  // Add Claude's response to the branch
  tree.addMessage('assistant', assistantMessage);
  
  return assistantMessage;
}

// ─── USAGE ───

const tree = new ConversationTree();

// Build up conversation
await chat(tree, "Let's design OLO");        // msg 0,1
await chat(tree, "Focus on blue channel");    // msg 2,3

// Save checkpoint
tree.checkpoint("blue-channel-base");

// Continue on Branch A
await chat(tree, "Go deeper on JPEG loss");   // msg 4a, 5a
await chat(tree, "What's the conclusion?");   // msg 6a, 7a
// Branch A reaches conclusion

// NOW: Go back and branch
tree.branch(tree.checkpoints.get("blue-channel-base"));

// Branch B: Claude has NO KNOWLEDGE of Branch A
await chat(tree, "What about PNG instead?");  // msg 4b, 5b
// Claude only sees: msg0, msg1, msg2, msg3, msg4b
// The JPEG conversation doesn't exist in this timeline
```

---

## METHOD 2: CLAUDE.AI TAB CLONING (NO API NEEDED)

If you don't want to use the API directly, you can approximate
branching using Claude.ai's own interface:

```
APPROACH: Snapshot the conversation, open new tab, replay

1. In the current Claude.ai chat, you're at message 6
2. You want to branch from message 3
3. The extension captures messages 1-3 (scrapes the DOM)
4. Opens a NEW Claude.ai chat (new tab)
5. Pastes a "context replay" as the first message:

   "Here is the context from our previous discussion:
   
   [User]: Let's design the OLO system
   [Claude]: Here's my approach...
   [User]: Focus on the blue channel  
   [Claude]: The blue channel works by...
   
   Continue from this point. I want to explore 
   a different direction: What about PNG instead?"

6. Claude reads the replayed context as if it happened
7. New timeline proceeds from message 3's state
8. Original tab still has the Branch A timeline
```

### Limitations:
```
- Context replay isn't identical to being in the actual conversation
  (Claude knows it's reading a summary, not living it)
- Long conversations = huge replay messages (hits context window)
- No perfect state restoration (Claude's "feeling" of the conversation
  is approximated, not cloned)
- Can't branch from a specific assistant response 
  (only from what you can copy)
```

### But it's FREE and works TODAY with just an extension.

---

## METHOD 3: HYBRID (THE RIGHT ANSWER)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  OLO EXTENSION (in Chrome or Electron)              │
│                                                     │
│  ┌─── CONVERSATION TREE ENGINE ───┐                 │
│  │                                │                 │
│  │  Stores the tree locally       │                 │
│  │  Each node = one message       │                 │
│  │  Branches tracked by parent    │                 │
│  │  Checkpoints saved by name     │                 │
│  │                                │                 │
│  │  TWO MODES:                    │                 │
│  │                                │                 │
│  │  MODE A: API Direct            │                 │
│  │  └─ If Tom has API credits     │                 │
│  │     Send messages[] to API     │                 │
│  │     Full control, exact state  │                 │
│  │     Display in custom UI       │                 │
│  │                                │                 │
│  │  MODE B: Claude.ai Replay      │                 │
│  │  └─ If using guest passes      │                 │
│  │     Open new tab               │                 │
│  │     Replay context as message  │                 │
│  │     Approximate but free       │                 │
│  │                                │                 │
│  └────────────────────────────────┘                 │
│                                                     │
│  Either way, the TREE is the same data structure.   │
│  The mode just determines how branches execute.     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## VECTOR RETRIEVAL ACROSS BRANCHES
## (The "No Past Future" With Optional Cherry-Pick)

This is the subtle part. When you branch from checkpoint:

```
DEFAULT: Branch B knows NOTHING about Branch A.
         Clean split. No future contamination.

BUT SOMETIMES: You want to pull ONE INSIGHT from Branch A
               into Branch B without importing the whole timeline.

THIS IS VECTOR RETRIEVAL.
```

### How it works:

```
1. Every message in every branch gets EMBEDDED
   (turned into a vector using an embedding model)

2. Embeddings stored in a local vector index
   (using something like hnswlib, or even just cosine similarity)

3. When you're on Branch B and want to pull from other branches:

   /retrieve "What did we learn about JPEG compression?"
   
4. The system searches ALL branches' embeddings
   for messages semantically similar to the query

5. Returns the relevant messages WITH METADATA:
   - Which branch they came from
   - What checkpoint they're after
   - How far into that branch

6. Tom CHOOSES what to inject:
   "Inject finding #3 into this branch"

7. The selected insight gets added as context:
   "From a parallel exploration, I found that: [insight]"
   
8. Claude on Branch B now has that ONE finding
   without knowing the whole Branch A timeline
```

### The key insight: RETRIEVAL IS NOT CONTAMINATION

```
CONTAMINATION:  Branch B sees all of Branch A's messages
                (Claude's context includes the other timeline)
                This ruins the branch — it's not independent anymore

RETRIEVAL:      Branch B sees ONE specific finding, framed as 
                external knowledge ("from a parallel exploration")
                Claude doesn't know the path that led to the finding
                Only the finding itself
                
                Like reading a paper's CONCLUSION without reading
                the paper. You get the result without the journey.
```

### Implementation:

```javascript
class VectorIndex {
  constructor() {
    this.entries = []; // { id, branch, nodeId, text, embedding }
  }

  async embed(text) {
    // Use a local embedding model or API
    // For local: use transformers.js with all-MiniLM-L6-v2
    // For API: use Anthropic's or OpenAI's embedding endpoint
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text })
    });
    const data = await response.json();
    return data.data[0].embedding;
  }

  async addMessage(nodeId, branchName, text) {
    const embedding = await this.embed(text);
    this.entries.push({ id: crypto.randomUUID(), branch: branchName, nodeId, text, embedding });
  }

  async search(query, options = {}) {
    const queryEmbed = await this.embed(query);
    
    // Cosine similarity
    const scored = this.entries
      .filter(e => {
        // Optionally exclude current branch (no self-retrieval)
        if (options.excludeBranch && e.branch === options.excludeBranch) return false;
        // Optionally only search specific branches
        if (options.onlyBranches && !options.onlyBranches.includes(e.branch)) return false;
        return true;
      })
      .map(e => ({
        ...e,
        score: cosineSimilarity(queryEmbed, e.embedding)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, options.topK || 5);

    return scored;
  }
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
```

### Retrieval in practice:

```javascript
// Tom is on Branch B, wants insight from other branches

const results = await vectorIndex.search(
  "JPEG compression blue channel loss",
  { 
    excludeBranch: "branch-b",  // Don't find our own messages
    topK: 3                      // Top 3 most relevant
  }
);

// Results:
// [
//   { branch: "branch-a", text: "JPEG 4:2:0 subsampling destroys 75% of blue...", score: 0.94 },
//   { branch: "branch-a", text: "The blue channel has lowest human sensitivity...", score: 0.87 },
//   { branch: "branch-c", text: "PNG preserves all channels losslessly...", score: 0.72 },
// ]

// Tom selects result #1 to inject:

tree.addMessage('user', 
  `From a parallel exploration, I found this relevant insight: 
   "JPEG 4:2:0 subsampling destroys 75% of blue channel data."
   
   Given this finding, how should we approach the PNG strategy?`
);

// Claude on Branch B now knows the JPEG finding
// but doesn't know how Branch A arrived at it
// or what else Branch A discussed
```

---

## THE VISUAL: BRANCH NAVIGATOR

In the OLO extension sidebar:

```
┌──────────────────────────────────┐
│ CONVERSATION TREE                │
│                                  │
│  ● MSG 1: "Design OLO"          │  ← Root (shared)
│  │                               │
│  ● MSG 2: "Blue channel"        │  ← Shared
│  │                               │
│  ● MSG 3: Reply about blue      │  ← Shared
│  │                               │
│  ◆ CHECKPOINT: blue-base         │  ← Checkpoint marker
│  │                               │
│  ├─● Branch A (JPEG path)       │  ← Branch A  
│  │  ├─● "JPEG compression"      │
│  │  ├─● "4:2:0 subsampling"     │
│  │  └─● "Conclusion: blue dies" │
│  │                               │
│  └─● Branch B (PNG path) ◄──    │  ← Branch B (ACTIVE)
│     ├─● "PNG approach?"         │
│     ├─● [retrieved: JPEG loss]  │  ← Cherry-picked from A
│     └─● "PNG preserves but..."  │
│                                  │
│  [+ New Branch from ◆]          │
│  [🔍 Retrieve across branches]  │
│                                  │
│  ACTIVE: Branch B               │
│  DEPTH: 3 from checkpoint       │
│  BRANCHES: 2                    │
│  RETRIEVALS: 1                  │
└──────────────────────────────────┘
```

### Interactions:
```
Click node         → View that message
Click checkpoint   → Options: new branch, rename, delete
Click branch       → Switch active branch (loads those messages)
Right-click node   → Branch from here (creates new checkpoint)
🔍 button          → Open retrieval search across all branches
Drag node          → Reorder within branch (if user messages)

Color coding:
  ● Green  = shared ancestor messages
  ◆ Yellow = checkpoint
  ● Blue   = Branch A messages
  ● Purple = Branch B messages
  ● Orange = Retrieved/injected from another branch
```

---

## SIMPLEST POSSIBLE IMPLEMENTATION
## (what we build FIRST)

Forget vector retrieval for now. Forget embeddings.
The MVP is just this:

```
1. CAPTURE: Save messages as you chat 
   (content script scrapes claude.ai DOM)

2. CHECKPOINT: User clicks "Save checkpoint" 
   (stores message array up to that point)

3. BRANCH: User clicks "Branch from checkpoint"
   (opens new claude.ai tab, replays messages as context)

4. NAVIGATE: Sidebar shows the tree
   (which branches exist, which is active)

That's it. Four features. Everything else is enhancement.
```

### The minimal data model:

```javascript
// That's the whole model

const conversationTree = {
  id: "tree_001",
  
  // All messages across all branches
  messages: {
    "m1": { role: "user",      content: "...", parent: null },
    "m2": { role: "assistant", content: "...", parent: "m1" },
    "m3": { role: "user",      content: "...", parent: "m2" },
    "m4": { role: "assistant", content: "...", parent: "m3" },
    // Branch A
    "m5a": { role: "user",      content: "...", parent: "m4" },
    "m6a": { role: "assistant", content: "...", parent: "m5a" },
    // Branch B
    "m5b": { role: "user",      content: "...", parent: "m4" },
    "m6b": { role: "assistant", content: "...", parent: "m5b" },
  },
  
  checkpoints: {
    "blue-base": "m4"  // Node ID of the checkpoint
  },
  
  branches: {
    "main":     { tip: "m4",  tab: "tab_abc" },
    "branch-a": { tip: "m6a", tab: "tab_def" },
    "branch-b": { tip: "m6b", tab: "tab_ghi" },
  },
  
  activeBranch: "branch-b"
};

// To get messages for any branch:
function getBranchMessages(tree, branchName) {
  const messages = [];
  let nodeId = tree.branches[branchName].tip;
  
  while (nodeId) {
    const node = tree.messages[nodeId];
    messages.unshift({ role: node.role, content: node.content });
    nodeId = node.parent;
  }
  
  return messages;
}
// This walks up the tree from tip to root.
// Each branch gets exactly its lineage. No cross-contamination.
```

---

## HOW THIS FITS INTO OLO GUARD

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  OLO EXTENSION                                  │
│  ├── Tab Organizer (projects/tracks/chains)     │
│  ├── Conversation Tree (branches/checkpoints)   │  ← NEW
│  ├── Vector Retrieval (cross-branch search)     │  ← NEW  
│  ├── OLO Guard (adversarial display)            │
│  ├── Artifact Pipeline (collect/inject)         │
│  └── Bridge (Chrome ↔ Electron abstraction)     │
│                                                 │
│  THE TREE LIVES INSIDE A CHAIN:                 │
│                                                 │
│  PROJECT: GentlyOS                              │
│    TRACK: OLO Guard Design                      │
│      CHAIN: Blue Channel Research               │
│        TREE:                                    │
│          ├── Branch A: JPEG path                │
│          ├── Branch B: PNG path                 │
│          └── Branch C: WebP exploration         │
│                                                 │
│  A chain can have ONE tree.                     │
│  Each branch in the tree maps to a Claude tab.  │
│  The chain links branches in exploration order.  │
│  The tree links branches by shared ancestry.    │
│                                                 │
│  CHAIN = temporal order (when you explored)     │
│  TREE = logical order (where branches diverge)  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## THE GIT ANALOGY (IT'S EXACT)

```
GIT                          CONVERSATION TREE
─────────────────────────    ─────────────────────────
commit                       message (user or assistant)
branch                       branch
tag                          checkpoint
HEAD                         activeBranch
checkout                     switch to branch
cherry-pick                  vector retrieval injection
merge                        combine branch conclusions
diff                         compare branch paths
log                          branch message history
stash                        pause branch (park it)

git init                     new conversation tree
git commit                   send message, get reply
git branch feature-x         branch from checkpoint
git checkout feature-x       switch active branch
git cherry-pick abc123       retrieve insight from other branch
git tag v1.0-blue-base       save checkpoint
git log --graph              view tree in sidebar
```

**You already know git. This is the same thing.**
**Commits are messages. Branches are timelines. Cherry-pick is retrieval.**

---

*Start a thought. Go deep. Hit a wall.*
*Rewind. Try another path. Go deep again.*
*Cherry-pick the gold from abandoned branches.*
*The tree remembers every path you didn't take.*
