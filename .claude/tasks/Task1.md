Got it. B3 already exists and already consumes S15 XML. The problem is not that B3 is missing, it is that the current system does not enforce ordering, so B3 might run before S15 is done (or without using the cached S15 output).

Here is the corrected cleaned-up task:

---

### Task: Enforce Ordered (Sequential) Execution for Dependent Prompts (B3 + B13)

We are increasing extraction complexity to improve quality. That requires enforcing execution order for prompts that depend on earlier outputs. Today, workers can run prompts out of order, which breaks dependency assumptions.

#### Problem

Workers currently schedule prompt jobs independently, so dependent stages can run:

* before their prerequisites finish
* without the correct upstream cached output
* in the wrong order across workers/containers

---

### Requirements

#### 1. B13 Sequencing (New Dependency Chain)

Introduce a two-stage B13 flow with strict ordering:

* **B13A**

  * Input: S17 XML output
  * Must run first.

* **B13B**

  * Input: S17 XML output + B13A output
  * Must run only after B13A completes.

Dependency chain:
S17 → B13A → B13B

---

#### 2. B3 Ordering (Already Exists, Needs Enforcement)

B3 already consumes S15 XML. The change is to enforce that:

* **S15 runs first**
* **S15 output is cached**
* **B3 runs only after S15 is complete**
* **B3 runs only if the S15 result qualifies**

Dependency chain:
S15 → cache S15 output → qualification check → B3

---

### Implementation Expectations (High-Level)

Add a scheduling/locking mechanism so each stage:

* checks prerequisite completion flags before running
* reads upstream cached output instead of recomputing
* is not eligible for worker pickup until prerequisites are satisfied

---

If you want, I can also rewrite this as a ticket with: scope, acceptance criteria, and non-goals.
