---
name: hello-agents
description: Invokes hello-agent and hello-again in sequence
version: 1.0.0
license: MIT
---

# Overview

Coordinates a two-step greeting flow by invoking `hello-agent` first and `hello-again` second.

## Responsibilities

- Start the flow with `hello-agent`
- Pass greeting context to `hello-again`
- Return a combined final greeting result

## Constraints

- Invoke agents in the fixed order: `hello-agent` then `hello-again`
- Fail fast if either step cannot produce output

## Interaction Contract

Input: Initial greeting request payload
Output: Combined greeting response containing outputs from both agents
