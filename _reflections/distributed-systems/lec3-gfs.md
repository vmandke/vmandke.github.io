---
layout: post
title: "GFS — MIT 6.584 Lecture Notes"
date: 2026-03-01
category: distributed-systems
---


**Course:** MIT 6.584 — Distributed Systems | **Lecture:** 3  
**Reference:** [YouTube Lecture](https://www.youtube.com/watch?v=6ETFk1-53qU) 

---

*Digitized from handwritten notes — MIT 6.584, Lecture 3: GFS. (Expect a few digitization mistakes)*
---

## Table of Contents
1. [Storage Systems & Motivation](#1-storage-systems--motivation)
2. [Ideal Consistency](#2-ideal-consistency)
3. [GFS Overview & Architecture](#3-gfs-overview--architecture)
4. [Master & Chunk Servers — Internals](#4-master--chunk-servers--internals)
5. [Reading a File](#5-reading-a-file)
6. [Writing & Record Append](#6-writing--record-append)
7. [Consistency, Failures & Summary](#7-consistency-failures--summary)
8. [Corrections & Clarifications](#corrections--clarifications)

---

## 1. Storage Systems & Motivation

This lecture covers **GFS internals**. The central theme is **consistency** — one of the hardest problems in distributed systems.

### Why Storage Systems Matter

Storage systems are the **building block for fault-tolerant systems**. The key property they provide is *durable storage*:

- Applications can be **stateless** — all persistent state lives in the storage layer.
  - App has only *soft state* (ephemeral, in memory)
  - On bootup → the app reads its state back from storage
- Goal: storage systems should be **highly fault tolerant** — and that's the tricky part.

### Why Is It Hard?

**High Performance** — Need to support MapReduce-style workloads → data must be sharded across many servers so mappers can read in parallel.

**Many Servers = Constant Faults** — At scale, some servers are *always* failing. With 1000 machines, if each fails once/year → **~3 failures per day**.

### Fault Tolerance via Replication

- **Replication** → copy data on multiple disks / places
  - Problem: data in multiple places → can become **out of sync** → potential inconsistencies
- **Strong Consistency** → replicated system behaves as if *un-replicated* (single machine illusion)
  - Cost: **lower performance** (need coordination on every write)

> ⚡ **The Conundrum:** High performance demands replication. Replication creates inconsistency. Strong consistency costs performance. You can't have all three easily.

---

## 2. Ideal Consistency

> **Definition:** Ideal (Strong) Consistency — The cluster of machines behaves as if it is a *single machine*. Every read sees the most recent write.

This is hard to achieve because of two main hazards: **concurrency** and **failures**.

### Hazard 1 — Concurrency

Multiple clients writing concurrently. Consider: **C₁ → W×1** and **C₂ → W×2** happening simultaneously.

```
         ─────────────── time ───────────────▶

         C₁   C₂   C₃   C₄
         ┌────┬────┬────┬────┐
W×1 ──▶  │    │    │    │    │
W×2 ──▶  │    │    │ R? │ R? │
         └────┴────┴────┴────┘

Question: Does C₄ see what C₃ sees?
Can C₄ observe write X=2 when C₃ still reads X=1?
```

We **need rules** that define what will happen. Typically analyzed using *traces* and *logs*.

> **Note:** "R×?" denotes a read of value X with an uncertain outcome — the question is whether all clients observe writes in the same order.

### Hazard 2 — Bad Replication Plan (No Coordination)

```
C₁ ──────▶ S₁ ──[🖥]   C₁ W×1   ┌─ inconsistent:
     1                  C₂ W×2   │  no protocol
C₂ - - -▶ S₂ ──[🖥]   C₃        │  to co-ordinate
     2                  C₄        └  writes.

S₁ might have X=2,2  while S₂ has X=2,2 in different order
→ clients reading from different servers see different values
```

- Without a coordination protocol for writes, replicas diverge.
- C₃ might see `2,2` on S₁; C₄ might see `2,2` on S₂ — but written in a different order → inconsistent state.

### GFS as a Case Study

- GFS was built in the **late 2000s** — distributed file systems were well understood by then, but GFS was *not* designed to be a standard solution.
- Purpose-built for **high performance**, **replication**, and **consistency** for Google's internal workloads.
- Its successor is **Colossus**.
- **HDFS** (Hadoop Distributed File System) was directly inspired by GFS.
- It was a **successful, real-world production system** at massive scale.

---

## 3. GFS Overview & Architecture

### What GFS Was Built For

- GFS is the **file system for MapReduce**.
- MapReduce performance is fundamentally limited by the **rate at which mappers can read files from GFS**.
- Roughly, throughput was ~**30 MB/s on SCP** at the time.
- Reading **2× MB/s** from GFS was an achievement — enabled by reading *in parallel from many servers*.

**Design Goals:** GFS stores big, large datasets. It must be:
- **Fast** — automatic sharding
- **Global** — all apps see the same file system
- **Fault Tolerant** — automatic recovery

### Single Master Design

- GFS uses a **single master** node — this is intentional.
  - ⚠️ This is a **single point of failure** — not replicated in the traditional sense.
  - Not strongly consistent in all cases, but *eventually consistent*.
- The design is primarily driven by **fault tolerance** requirements.
- Scale of the system was *impressive* — a "standard" hard problem at Google's scale.

### GFS Architecture

```
                                      /foo/bar
                      ┌──────────────────────────────┐
                      │  Master                       │
                      │  namespace: /foo/bar → [handles]│
                      └──────────┬───────────────────┘
                                 │ ▲
filename, chunk#  ───────────────▶│ │
chunk handle, locations ◀────────│ │ heartbeat / state
                                 │ │
┌────────────────┐               │ ▼
│  App / Client  │         ┌─────────────────────────────┐
│                │         │  Chunk Servers               │
│ req: handle +  │────────▶│  Linux fs  (64 MB chunks)   │
│     byte range │         │  [🖴][🖴]                    │
│                │◀────────│                             │
│     data       │         └─────────────────────────────┘
└────────────────┘
```

### Key Architectural Points

- **App/Client:** Sends filename + chunk# to master; receives chunk handle + locations; then reads data directly from chunk servers.
- **Master:** Manages the *namespace* (e.g., `/foo/bar`) — maps filenames to arrays of chunk handles.
- **Chunk Servers:** Store actual data using the **Linux file system**. Each chunk server has its own local disk.
- The client **caches** the chunk handle + location list — so it doesn't need to ask the master every time. This reduces master load.
- Multiple chunk servers serve the same data → high throughput via parallel reads.

> ⚠️ **Correction:** The notes say "not consistent" for the single master. More precisely: GFS provides **relaxed consistency** — it guarantees consistency for *sequential writes*, but concurrent writes may lead to undefined (though not corrupted) regions. The system is not strongly consistent but is carefully documented in the GFS paper.

---

## 4. Master & Chunk Servers — Internals

### Application Flow

- Application: **MapReduce Job** → linked with GFS client library.
- **Master** is in charge of *where things are* (metadata only).

### Chunks

- A file can have **many, many chunks**.
- Each chunk is **64 MB**.
  - 64 MB → corresponds to a Linux file on the chunk server's local disk.
- GFS client gets the **chunk location from the master**, then reads directly from the chunk server.
- Multiple clients can read from the same set of servers simultaneously → **high throughput**.

> **Why 64 MB chunks?** Large chunks reduce the number of interactions with the master (fewer metadata lookups). Clients can cache chunk locations longer, reducing master bottlenecks. Tradeoff: more wasted space for small files.

### Master — Control Center

- Maintains mapping: **filename → array of chunk handles**
  - Stored **in memory** for fast access
- Architecture: **1 Master / many clients**
- Each **chunk handle** maps to:
  - **Version number**
  - **List of chunk servers** that hold the chunk
  - One server is designated **primary**, others are **secondary**
  - Default: **3× replication factor**

### Logs & Checkpoints

- Master maintains a **log** of all operations (changes to namespace, mapping, etc.) written to **stable storage**.
- Also maintains **checkpoints** of its in-memory state.
  - The log + checkpoint allows the master to *reconstruct its internal state* after a crash.
- Master prefers to **write to stable storage before replying** — ensures durability.

### What Needs to Be in Stable Storage?

```
Stable Storage (Persistent):
  ✔ Array of chunk handles         (survives crash)
  ✔ Version numbers                (crucial for detecting stale replicas)
  ✔ Namespace / filename mappings  (log + checkpoint)

Volatile (Reconstructible):
  ✘ Chunk server locations         (ask chunk servers on restart)
```

- **Chunk server locations** do NOT need to be in stable storage — on restart, master asks all chunk servers *"what chunks do you have?"* and reconstructs the mapping.
- **Version numbers** DO need stable storage — chunk servers are volatile and can fail + return with stale data. Version numbers let the master detect stale replicas.

> ⚠️ **Correction (garbled note):** The notes say "Checkpointing — gas entries reading... store is not preferred." The correct idea: the master writes **log entries** to stable storage before replying to clients. Checkpoints are periodic snapshots of in-memory state. Together they allow full recovery.

---

## 5. Reading a File

### Read Flow

**Step 1 — Client → Master**
Client sends **filename + chunk number** to master.

**Step 2 — Master → Client**
Master returns **chunk handle** + list of chunk servers that hold it.

**Step 3 — Client Caches**
Client **caches** the chunk handle + server list. Reduces overhead — master is a single machine; too many clients talking to it would create a bottleneck.

**Step 4 — Client → Closest Chunk Server**
Client sends **chunk handle + byte range (offset + length)** to the *closest* chunk server.

**Step 5 — Chunk Server Checks Version #**
Chunk server verifies its version number matches. If OK → sends data. Prevents reading **stale data**.

```
Client                  Master              Chunk Server
  │                       │                      │
  │─── filename, chunk# ─▶│                      │
  │◀── handle, servers ───│                      │
  │                                              │
  │─── handle + [offset | chunk#] ──────────────▶│
  │◀── data ────────────────────────────────────│
```

### Why Read from the Closest Server?

- **Network:** Pump as much data as possible over the network.
- Reduce **latency** by reading locally or from the nearest rack.
- Maximize **throughput** — when reading in parallel from many servers, geographic proximity matters.
- Reading from multiple servers simultaneously (fan-out read) gives high aggregate bandwidth.

> ⚠️ **Clarification:** "max(live-chunk) may not be correct" in the notes refers to version numbers. A chunk server that was offline might have a *lower version number* (stale). The master returns only servers with the **latest version**. The "live chunk" heuristic without version checking would be unsafe.

---

## 6. Writing & Record Append

GFS separates the **control path** (through master) from the **data path** (client → chunk servers directly).

### Write / Record Append Flow

```
Client       Master      Secondary A    Primary        Secondary B
  │             │               │            │               │
① │── req ──────▶│               │            │               │
  │◀── P+S ──────│               │            │               │
  │                                           │               │
② │◀──────────────────── ack ────────────────│               │
  │                                                            │
③ │──────────── data ──────────────────────────────────────────▶│
④ │──────────── data ─────────────────────────────▶│           │
  │                                            │               │
⑤ │─── append ─────────────────────────────────▶│              │
  │                                            │               │
  │                                   ⑥ primary ──── fwd ─────▶│
  │                                            │               │
⑦ │◀─────────────────────────────── ack ───────│               │
```

### Step-by-Step Write Protocol

**① Client → Master: Request Primary**  
Client asks master for the primary and secondaries for the target chunk. If no primary exists, master picks one.

**② Master Grants Lease**  
Master picks a primary → **grants a lease** (with expiry time). Master also **increments version number** and tells both P + S. They form a *replica group*.

**③④ Client Pushes Data to All Replicas**  
Client sends the data to the **closest secondary**. That secondary forwards to primary; primary forwards to other secondaries. This is a *pipeline push* — decouples data flow from control flow.

**⑤ Client Sends Append Command to Primary**  
Client sends `append` message to primary. Primary **checks version number** and its **own lease** to confirm it is still the valid primary.

**⑥ Primary Picks Offset & Notifies Secondaries**  
Primary picks the **offset to write**. Sends write messages (with the chosen offset) to *all secondaries*. The same offset for all → consistent placement.

**⑦ Ack Back to Client**  
Once all secondaries ack, primary sends **success** back to client. If any secondary fails → client library will **retry**.

### Record Append — Key Details

- **Record Append** is the key write primitive in GFS — append a record rather than write to a specific offset.
- Initially, there may be **no primary** → master picks one.
- **Lease-based:** master grants the primary a time-limited lease with an expiry. Prevents split-brain if master loses contact.
- Primary + Secondaries form a **replica group** together.
- Client goes to *closest secondary* first to push data (bandwidth optimization).
  - Secondary **pushes** the data to primary; primary pushes to other secondaries.

> ⚠️ **Failure Handling:** If a secondary fails to write or doesn't respond → client library will **retry**. This means a record may be appended *more than once* in failure cases. GFS provides **at-least-once** semantics for record append, not exactly-once.

> **Data Path vs. Control Path:** GFS separates these deliberately. Data flows *client → secondaries → primary → secondary chain*. Control (commands like "append at offset X") flows *client → primary → secondaries*. This maximizes network utilization while keeping control logic simple.

---

## 7. Consistency, Failures & Summary

### Why This Works for MapReduce

- MapReduce workers do **record appends** → each append gives back an offset (record-id).
- **Checksums** + unique IDs per record.
- The **library handles deduplication** → responsible for checksums / record-id.

> Because GFS append is at-least-once, the application-level library (MapReduce) must handle duplicate records using checksums and record IDs obtained from the offset returned by append.

### Trust Model

- GFS assumes **all servers are trusted** — clients, chunk servers, master — everything is trusted.
- Google noted in the paper that this was an intentional design decision (datacenter environment).
- This simplifies authentication and access control significantly.

### Consistency: Split-Brain Problem

```
S₁ (Secondary)      Master           S₂ (Primary)
     │                 │                    │
     │  ◀── heartbeat ──│                   │
     │      ──────────▶ │                   │
     │                  │                   │
     │             S₂ goes out of network   │
     │             with Master              │
     │                  │                   │
     │                  │   ┌─────────────────────────────┐
     │                  │   │ Master must WAIT until       │
     │                  │   │ lease has EXPIRED            │
     │                  │   │ before assigning new primary.│
     │                  │   │ Otherwise: two primaries =   │
     │                  │   │ BIZARRE state.               │
     │                  │   └─────────────────────────────┘
```

- **Split Brain:** Client can connect to secondary even if secondary loses network contact with primary.
- The master must **wait until lease expires** before picking a new primary. Otherwise, two nodes think they are primary simultaneously → *bizarre* / incorrect state.
- Master tells the primary when its lease is over.

### How to Get Stronger Consistency?

- GFS's consistency is **relaxed / weak** — not ideal.
- To achieve **stronger consistency**: updates must be applied to **all secondaries OR none** (atomic).
  - Make failed writes *invisible* (rollback / hide partial writes).
- GFS does not fully implement this — it was designed for throughput, not strong consistency.

### GFS Legacy & What Came After

| System | Notes |
|---|---|
| **GFS** | Original, MapReduce-focused, relaxed consistency |
| **Colossus** | Successor to GFS at Google |
| **HDFS** | Open-source, inspired by GFS, Hadoop ecosystem |
| **Spanner** | Google's globally distributed DB — *much* stronger consistency |

### Summary — GFS Design Decisions

**What GFS Does Well:**
- High throughput for large sequential reads/writes (MapReduce workload)
- Automatic fault recovery
- Simple consistency model (relaxed but documented)
- Global file namespace

**Limitations:**
- Single master bottleneck
- Relaxed consistency (not ideal for all workloads)
- Not designed for small random reads/writes
- Single master = single point of failure (mitigated by checkpointing)

> **Key Takeaway:** GFS makes a deliberate trade-off: **strong consistency is sacrificed for high performance and availability**. The system is carefully engineered so that the relaxed consistency model is documented and applications (like MapReduce) are built to tolerate it. Later systems (Spanner) moved toward stronger guarantees at higher cost.

---

## Corrections & Clarifications

| Location | Issue | Correction |
|---|---|---|
| Page 3 | "not consistent" | GFS has **relaxed consistency**, not no consistency. Defined behavior for sequential writes; undefined (not corrupted) for concurrent appends. |
| Page 7 | "bizzare" | Correct spelling: **bizarre** |
| Page 5 | "max(live-chunk) may not be correct" | Refers to version numbers. A chunk server with an old version is stale and must not be used. Master tracks versions explicitly. |
| Page 4 | Garbled checkpoint section | Master writes **log entries** to stable storage *before* replying. Checkpoints are periodic in-memory snapshots. Together they reconstruct state on crash. |
| Page 3 | "reading 2k mbps" | Refers to **2× the per-disk bandwidth** — parallel reads from multiple chunk servers achieve higher aggregate throughput than a single machine could provide. |
| Page 6–7 | Retry logic implied | Record append is **at-least-once**, not exactly-once. Applications must use checksums/record-IDs for deduplication. |

---
<details>
<summary>📓 View original handwritten notes</summary>

<img src="/reflections/assets/gfs1.png" alt="Page 1" style="width:100%; margin:1rem 0;">
<img src="/reflections/assets/gfs2.png" alt="Page 2" style="width:100%; margin:1rem 0;">
<img src="/reflections/assets/gfs3.png" alt="Page 3" style="width:100%; margin:1rem 0;">
<img src="/reflections/assets/gfs4.png" alt="Page 4" style="width:100%; margin:1rem 0;">
<img src="/reflections/assets/gfs5.jpeg" alt="Page 5" style="width:100%; margin:1rem 0;">
<img src="/reflections/assets/gfs6.png" alt="Page 6" style="width:100%; margin:1rem 0;">
<img src="/reflections/assets/gfs7.png" alt="Page 7" style="width:100%; margin:1rem 0;">

</details>